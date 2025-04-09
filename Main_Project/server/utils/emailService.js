const nodemailer = require('nodemailer');
const SmtpSettings = require('../models/SmtpSettings');

/**
 * Tests SMTP connection without sending actual email
 * @returns {Promise<Object>} Result object with success status and message
 */
const testSmtpConnection = async () => {
  try {
    // Get latest SMTP settings
    const smtpSettings = await SmtpSettings.findOne().sort({ updatedAt: -1 });
    
    if (!smtpSettings) {
      return { success: false, message: 'SMTP settings not configured' };
    }

    console.log(`Testing SMTP connection to ${smtpSettings.host}:${smtpSettings.port}`);
    
    // Create test transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      auth: {
        user: smtpSettings.auth.user,
        pass: smtpSettings.auth.pass
      },
      connectionTimeout: 5000, // 5 seconds
      greetingTimeout: 5000,
      debug: true,
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
    
    // Test the connection
    const result = await transporter.verify();
    return { 
      success: true, 
      message: 'SMTP connection successful',
      smtp: {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure
      }
    };
  } catch (error) {
    console.error('SMTP Connection Test Error:', error);
    
    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Check if the SMTP server is accessible and the port is correct.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out. The server did not respond in time.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check your username and password.';
    } else if (error.code === 'ESOCKET') {
      errorMessage = 'Socket error. There might be network connectivity issues or firewall restrictions.';
    }
    
    return { 
      success: false, 
      message: errorMessage,
      originalError: error.message,
      errorCode: error.code
    };
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    // Get latest SMTP settings
    const smtpSettings = await SmtpSettings.findOne().sort({ updatedAt: -1 });
    
    if (!smtpSettings) {
      throw new Error('SMTP settings not configured');
    }
    
    // Create transporter with timeout options
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      auth: {
        user: smtpSettings.auth.user,
        pass: smtpSettings.auth.pass
      },
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000, // 10 seconds for greeting
      debug: true // Enable debugging
    });
    
    console.log(`Attempting to connect to SMTP server: ${smtpSettings.host}:${smtpSettings.port}`);
    
    // Verify SMTP connection first
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP connection verification failed:', error);
          reject(new Error(`Failed to connect to SMTP server: ${error.message}`));
        } else {
          console.log('SMTP connection successful, server is ready to send emails');
          resolve(success);
        }
      });
    });
    
    // Send mail
    const info = await transporter.sendMail({
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Fallback to stripped HTML
    });
    
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    let errorMessage = error.message;
    
    // Provide more user-friendly error messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      errorMessage = `Connection to SMTP server failed. Please check your SMTP settings and ensure the server is accessible.`;
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check your username and password.';
    }
    
    return { success: false, message: errorMessage, originalError: error };
  }
};

module.exports = { sendEmail, testSmtpConnection };
