import React from "react";
import { useNavigate } from "react-router-dom";
import { FaShieldAlt, FaRobot, FaReceipt, FaLeaf, FaCheckCircle, FaCertificate, FaHeart, FaUsers, FaGlobe, FaArrowRight, FaStar, FaTrophy, FaHandHoldingHeart } from 'react-icons/fa';
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        
        <div className="hero-content">
          <div className="hero-badge">
            <FaHeart className="badge-icon" />
            <span>Trusted by 10,000+ donors worldwide</span>
          </div>
          
          <h1 className="hero-title-top">Transform Lives Through</h1>
          <h1 className="hero-title-main">Transparent Giving</h1>
          
          <p className="hero-subtitle">
            Every donation is blockchain-verified, ensuring your generosity reaches those who need it most. Join thousands making a real difference.
          </p>
          
          <div className="hero-actions">
            <button className="cta-primary" onClick={() => navigate('/donate')}>
              <span>Start Donating</span>
              <FaArrowRight className="btn-icon" />
            </button>
            <button className="cta-secondary" onClick={() => navigate('/login')}>
              <span>Watch Demo</span>
            </button>
          </div>
          
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">$2.5M+</span>
              <span className="stat-label">Donated</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Lives Impacted</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">200+</span>
              <span className="stat-label">NGO Partners</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="trust-section">
        <div className="container">
          <p className="trust-title">Trusted by leading organizations worldwide</p>
          <div className="trust-logos">
            <div className="trust-logo">
              <img src="/Aptos.png" alt="Aptos Blockchain" />
            </div>
            <div className="trust-badge">
              <FaShieldAlt />
              <span>Blockchain Verified</span>
            </div>
            <div className="trust-badge">
              <FaCertificate />
              <span>Tax Deductible</span>
            </div>
            <div className="trust-badge">
              <FaTrophy />
              <span>Award Winning</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose Sustenance?</h2>
            <p className="section-subtitle">
              Experience the future of charitable giving with complete transparency and maximum impact
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card feature-card-primary">
              <div className="feature-icon-wrapper">
                <FaShieldAlt className="feature-icon" />
              </div>
              <h3>Blockchain Transparency</h3>
              <p>Every donation is recorded on the blockchain, providing immutable proof of your contribution and its impact.</p>
              <div className="feature-highlight">100% Transparent</div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaRobot className="feature-icon" />
              </div>
              <h3>AI-Powered Matching</h3>
              <p>Our intelligent system matches your donations with the most suitable NGOs based on your preferences and impact goals.</p>
              <div className="feature-highlight">Smart Recommendations</div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaReceipt className="feature-icon" />
              </div>
              <h3>Instant Certificates</h3>
              <p>Receive blockchain-verified tax certificates immediately after your donation for seamless record keeping.</p>
              <div className="feature-highlight">Tax Deductible</div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaLeaf className="feature-icon" />
              </div>
              <h3>Sustainability Focus</h3>
              <p>Promote circular economy by donating goods, reducing waste while helping communities in need.</p>
              <div className="feature-highlight">Eco-Friendly</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Simple. Secure. Impactful.</h2>
            <p className="section-subtitle">Making a difference has never been easier</p>
          </div>
          
          <div className="process-timeline">
            <div className="process-step">
              <div className="step-number">01</div>
              <div className="step-content">
                <div className="step-icon">
                  <FaHandHoldingHeart />
                </div>
                <h3>Choose Your Cause</h3>
                <p>Browse verified NGOs and select causes that resonate with your values and passion.</p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">02</div>
              <div className="step-content">
                <div className="step-icon">
                  <FaCheckCircle />
                </div>
                <h3>Make Your Donation</h3>
                <p>Donate money, goods, or services through our secure platform with multiple payment options.</p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">03</div>
              <div className="step-content">
                <div className="step-icon">
                  <FaShieldAlt />
                </div>
                <h3>Blockchain Verification</h3>
                <p>Your donation is instantly recorded on the blockchain, creating an immutable record of your generosity.</p>
              </div>
            </div>
            
            <div className="process-step">
              <div className="step-number">04</div>
              <div className="step-content">
                <div className="step-icon">
                  <FaCertificate />
                </div>
                <h3>Track Your Impact</h3>
                <p>Receive real-time updates and certificates showing exactly how your donation is making a difference.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="impact-section">
        <div className="container">
          <div className="impact-content">
            <div className="impact-text">
              <h2 className="section-title">Creating Real Impact Together</h2>
              <p className="section-description">
                Join thousands of donors who have already made a significant difference in communities worldwide through our transparent platform.
              </p>
              <button className="impact-cta" onClick={() => navigate('/social-feed')}>
                View Impact Stories
                <FaArrowRight />
              </button>
            </div>
            
            <div className="impact-stats">
              <div className="impact-stat">
                <div className="impact-number">$2.5M+</div>
                <span className="impact-label">Total Donations</span>
              </div>
              
              <div className="impact-stat">
                <div className="impact-number">50,000+</div>
                <span className="impact-label">Lives Impacted</span>
              </div>
              
              <div className="impact-stat">
                <div className="impact-number">200+</div>
                <span className="impact-label">NGO Partners</span>
              </div>
              
              <div className="impact-stat">
                <div className="impact-number">99.2%</div>
                <span className="impact-label">Transparency Score</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">What Our Community Says</h2>
          
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => <FaStar key={i} />)}
              </div>
              <p>"Sustenance has revolutionized how I give back. The transparency is incredible - I can see exactly where my donations go and the impact they make."</p>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Sarah Chen</strong>
                  <span>Regular Donor</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => <FaStar key={i} />)}
              </div>
              <p>"As an NGO, Sustenance has helped us connect with more donors and build trust through blockchain verification. It's a game-changer."</p>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Michael Rodriguez</strong>
                  <span>NGO Director</span>
                </div>
              </div>
            </div>
            
            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => <FaStar key={i} />)}
              </div>
              <p>"The AI recommendations are spot-on. I've discovered amazing causes I never knew existed, and the tax certificates are instant!"</p>
              <div className="testimonial-author">
                <div className="author-info">
                  <strong>Emily Johnson</strong>
                  <span>Corporate Donor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Make a Difference?</h2>
            <p className="cta-subtitle">
              Join thousands of donors creating positive change through transparent, blockchain-verified giving.
            </p>
            
            <div className="cta-buttons">
              <button className="cta-primary" onClick={() => navigate('/register')}>
                Start Donating Today
                <FaArrowRight />
              </button>
              <button className="cta-secondary" onClick={() => navigate('/recipient/register')}>
                Register Your NGO
              </button>
            </div>
            
            <div className="cta-features">
              <div className="cta-feature">
                <FaShieldAlt />
                <span>100% Secure</span>
              </div>
              <div className="cta-feature">
                <FaCertificate />
                <span>Tax Deductible</span>
              </div>
              <div className="cta-feature">
                <FaGlobe />
                <span>Global Impact</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
