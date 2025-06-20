const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to format date
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Function to get user's donation history
async function getUserDonations(userId, userName) {
  try {
    // Get goods donations
    const goodsQuery = `
      SELECT 
        item_type,
        quantity,
        condition,
        description,
        pickup_address,
        preferred_date,
        preferred_time,
        status,
        created_at,
        'goods' as donation_type
      FROM donations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    // Get monetary donations
    const moneyQuery = `
      SELECT 
        m.amount,
        m.message,
        m.status,
        m.created_at,
        'money' as donation_type,
        r.ngo_name as recipient_name
      FROM monetary_donations m
      LEFT JOIN recipient r ON m.recipient_id = r.recipient_id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC
      LIMIT 5
    `;
    
    const [goodsResult, moneyResult] = await Promise.all([
      pool.query(goodsQuery, [userId]),
      pool.query(moneyQuery, [userId])
    ]);
    
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
    
    if (allDonations.length === 0) {
      return `${userName} hasn't made any donations yet. Ready to make your first one?`;
    }
    
    const moneyDonations = allDonations.filter(d => d.donation_type === 'money');
    const goodsDonations = allDonations.filter(d => d.donation_type === 'goods');
    
    let context = `${userName}'s donation history:\n\n`;
    
    // Add summary
    const totalMoney = moneyDonations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    const totalGoods = goodsDonations.length;
    
    if (totalMoney > 0 && totalGoods > 0) {
      context += `Summary: $${totalMoney} in monetary donations + ${totalGoods} goods donation${totalGoods > 1 ? 's' : ''}\n\n`;
    } else if (totalMoney > 0) {
      context += `Summary: $${totalMoney} in monetary donations\n\n`;
    } else if (totalGoods > 0) {
      context += `Summary: ${totalGoods} goods donation${totalGoods > 1 ? 's' : ''}\n\n`;
    }
    
    // Show recent donations
    context += `Recent donations:\n`;
    allDonations.slice(0, 5).forEach((donation, index) => {
      if (donation.donation_type === 'money') {
        context += `💰 $${donation.amount} donated to ${donation.recipient_name || 'an NGO'}`;
        if (donation.message) context += ` with message: "${donation.message}"`;
        context += `\n📅 ${formatDate(donation.created_at)} - Status: ${donation.status}\n\n`;
      } else {
        context += `📦 ${donation.quantity} ${donation.condition?.toLowerCase() || ''} ${donation.item_type?.toLowerCase() || ''}${donation.quantity > 1 ? 's' : ''}`;
        if (donation.description) context += ` (${donation.description})`;
        context += `\n📅 Pickup: ${formatDate(donation.preferred_date)} during ${donation.preferred_time?.toLowerCase() || ''} from ${donation.pickup_address}`;
        context += `\n📋 Status: ${donation.status}\n\n`;
      }
    });
    
    return context;
  } catch (error) {
    console.error('Error fetching user donations:', error);
    return "Can't check your donations right now. Try again in a sec!";
  }
}

// Function to get recipient/NGO information
async function getRecipientInfo(message) {
  try {
    // Check if the message is asking about NGOs/recipients
    const isNGOQuery = message.toLowerCase().match(/ngo|organization|recipient|charity|foundation|when.*founded|what.*do|joined.*platform|about/);
    
    if (!isNGOQuery) return '';

    // Get approved recipients with their info
    const recipientsQuery = `
      SELECT 
        ngo_name,
        founded_date,
        ngo_description,
        email,
        address,
        phone,
        website,
        status,
        created_at as joined_platform
      FROM recipient 
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const recipientsResult = await pool.query(recipientsQuery);
    
    if (recipientsResult.rows.length === 0) {
      return "No NGOs are currently registered on the platform.";
    }

    // Get recent social posts from NGOs
    const postsQuery = `
      SELECT 
        b.post_description,
        b.date_posted,
        r.ngo_name
      FROM blogpost b
      LEFT JOIN recipient r ON b.recipient_id = r.recipient_id
      WHERE r.status = 'approved'
      ORDER BY b.date_posted DESC
      LIMIT 5
    `;
    
    const postsResult = await pool.query(postsQuery);

    let context = `Here are the NGOs on our platform:\n\n`;
    
    recipientsResult.rows.forEach((ngo, index) => {
      context += `${ngo.ngo_name}:
Founded: ${formatDate(ngo.founded_date)}
Joined platform: ${formatDate(ngo.joined_platform)}
What they do: ${ngo.ngo_description}
${ngo.website ? `Website: ${ngo.website}` : ''}
${ngo.address ? `Location: ${ngo.address}` : ''}
\n`;
    });

    if (postsResult.rows.length > 0) {
      context += `\nRecent updates from NGOs:\n`;
      postsResult.rows.forEach((post, index) => {
        context += `${post.ngo_name} (${formatDate(post.date_posted)}): ${post.post_description.substring(0, 150)}${post.post_description.length > 150 ? '...' : ''}\n`;
      });
    }

    return context;
  } catch (error) {
    console.error('Error fetching recipient info:', error);
    return "Can't get NGO info right now. Try again in a sec!";
  }
}

// Function to handle all chat interactions
async function handleChat(message, conversationHistory = [], user = null) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 200
    }
  });

  // Check if it's a donation query - expanded detection
  const isDonationQuery = message.toLowerCase().match(/donation|donate|contributed|gave|given|my.*donation|show.*donation|history|recent.*donation|what.*donated|how.*much|contributed|charity|help|support|fund|money|goods|item/);
  
  let donationContext = '';
  if (isDonationQuery && user) {
    donationContext = await getUserDonations(user.id, user.name);
  } else if (isDonationQuery && !user) {
    donationContext = "Please log in to see your donation history!";
  }

  // Get recipient/NGO information
  const recipientContext = await getRecipientInfo(message);

  const userName = user ? user.name : 'there';

  const prompt = `
    You are Sora, a friendly AI assistant for the Sustenance donation platform.
    
    You're currently talking to: ${userName}
    
    Your personality:
    - Casual and warm, like talking to a friend
    - Keep responses short (1-3 sentences max)
    - Use natural language, contractions, and emojis occasionally
    - Be helpful but not overly formal
    - Show genuine interest in helping people donate and learn about NGOs
    - Address the user by name when appropriate
    
    Context from previous messages:
    ${conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
    
    ${donationContext ? `${userName}'s donation info: ${donationContext}` : ''}
    
    ${recipientContext ? `NGO/Organization info: ${recipientContext}` : ''}
    
    User says: "${message}"
    
    Respond as Sora would - naturally, briefly, and helpfully. If they ask about donations, show THEIR specific donations. If they ask about NGOs, tell them about the ones on the platform. Don't over-explain.
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Main chat route - now with authentication
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const user = req.user;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user details from database
    let userData = null;
    if (user) {
      try {
        const userQuery = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [user.id]);
        if (userQuery.rows.length > 0) {
          userData = userQuery.rows[0];
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }

    const response = await handleChat(message, history, userData);
    return res.json({ response });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
});

module.exports = router; 