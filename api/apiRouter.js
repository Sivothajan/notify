
import express, { json } from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import UAParser from 'ua-parser-js';
import dotenv from 'dotenv';

const base64Encode = (text) => Buffer.from(text).toString('base64');

dotenv.config();

const toBoolean = (value) => (value?.toLowerCase() === "true");
const isDefined = (value) => value !== undefined && value !== null;


const NTFY_USERNAME = process.env.NTFY_USERNAME;
const NTFY_PASSWORD = process.env.NTFY_PASSWORD;
const NTFY_SERVER_DOMAIN = isDefined(process.env.NTFY_SERVER_DOMAIN) ? process.env.NTFY_SERVER_DOMAIN : "ntfy.sivothajan.me"; 
const NTFY_CHANEL_NAME = process.env.NTFY_CHANEL_NAME ? process.env.NTFY_CHANEL_NAME : process.env.NTFY_USERNAME;

const AUTH_HEADER = 'Basic ' + base64Encode(NTFY_USERNAME + ":" + NTFY_PASSWORD);

const NTFY_URL = `https://${NTFY_SERVER_DOMAIN}/${NTFY_CHANEL_NAME}`;

const REDIRECT_URL = process.env.REDIRECT_URL ? process.env.REDIRECT_URL : "https://sivothajan.me";
const ERROR_404_REDIRECT = toBoolean(process.env.ERROR_404_REDIRECT);

const TIME_ZONE = process.env.TIME_ZONE ? process.env.TIME_ZONE : 'UTC';
const LOCALE_IDENTIFIER = process.env.LOCALE_IDENTIFIER ? process.env.LOCALE_IDENTIFIER : 'en-US';

const GET_IPV4_URL = process.env.GET_IPV4_URL ? process.env.GET_IPV4_URL : 'https://api.ipify.org?format=json';
const GET_IPV6_URL = process.env.GET_IPV6_URL ? process.env.GET_IPV6_URL : 'https://api64.ipify.org?format=json';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST','OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
}));

app.use(json());

const  fetchIP = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}

const getNormalIPAddresses = async () => {
  const [ipv4, ipv6] = await Promise.all([fetchIP(GET_IPV4_URL), fetchIP(GET_IPV6_URL)]);
  return { ipv4, ipv6 };
}

const getDeviceInfo = async (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  return {
    userAgent: result.ua || 'Unknown',
    platform: result.os.name || 'Unknown',
    screenWidth: 'Unknown',
    screenHeight: 'Unknown',
    colorDepth: 'Unknown',
    touchEnabled: 'Unknown',
    deviceModel: result.device.model || 'Unknown',
    os: result.os.name || 'Unknown',
    browser: result.browser.name || 'Unknown'
  };
}

const formatDeviceInfo = (jsonString) => {
  if (!jsonString) {
    console.error("Invalid input: JSON string is null or undefined");
    return "";
  }
  try {
    const info = JSON.parse(jsonString);
    return Object.entries(info)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
  } catch (error) {
    console.error("Invalid JSON string:", error.message);
    return "";
  }
};

const getTime = (LOCALE_IDENTIFIER) => {
  const options = {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
  };
  return new Intl.DateTimeFormat(LOCALE_IDENTIFIER, options).format(new Date());
};

const sendNotification = async (title, message) => {
  try {
    const response = await fetch(NTFY_URL, {
      method: 'POST',
      body: message,
      headers: {
        'Content-Type': 'text/plain',
        'Title': title,
        'Priority': 'urgent',
        'Tags': 'warning',
        'Authorization': AUTH_HEADER ,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

app.get('/*', async (req, res) => {

    res.set('Link', `<${'https://sivothajan.me/favicon/favicon.ico'}>; rel="icon"`);
    res.set('Link', `<${'https://sivothajan.me/favicon/apple-touch-icon.webp'}>; rel="apple-touch-icon" sizes="180x180"`);
    res.set('Link', `<${'https://sivothajan.me/favicon/favicon-32x32.webp'}>; rel="icon" type="image/png" sizes="32x32"`);
    res.set('Link', `<${'https://sivothajan.me/favicon/favicon-16x16.webp'}>; rel="icon" type="image/png" sizes="16x16"`);
    res.set('Link', `<${'https://sivothajan.me/favicon/site.webmanifest'}>; rel="manifest"`);
  
    res.set('X-Robots-Tag', 'noindex, nofollow');

    res.set('X-Title', 'Sivothajan.me');

    if(req.url === '/api/check'){
        res.status(200).json({ message: {'API Status Response': 'API is working!'} });
    } else if(req.url==='/api/notify'){
      res.status(200).json({ message: {'API Status Response': 'notify API is working!'} });
    } else {
      ERROR_404_REDIRECT ? res.redirect(`${REDIRECT_URL}/404#${req.url}#from-api`) : res.redirect(`${REDIRECT_URL}#${req.url}#from-api`);
    }
});

app.post('/api/notify', async (req, res) => {
  const { deviceInfo, currentPageUrl } = req.body;
  const userAgent = req.headers['user-agent'];
  const timestamp = getTime(LOCALE_IDENTIFIER);
    
  try {
    const normalIPs = await getNormalIPAddresses();
    
    let ipMessage = '';
    if (normalIPs.ipv4 && normalIPs.ipv6) {
      ipMessage = `IPv4: ${normalIPs.ipv4}\nIPv6: ${normalIPs.ipv6}`;
    } else {
      ipMessage = `IPv4: ${normalIPs.ipv4 || 'Not available'}\nIPv6: ${normalIPs.ipv6 || 'Not available'}`;
    }
    
    const formattedDeviceInfo = formatDeviceInfo(deviceInfo);
    const deviceDetails = await getDeviceInfo(userAgent);
    const message = `Visit Time: ${timestamp}\nSomeone has visited ${currentPageUrl}\n${ipMessage}\nDevice Details:\n${formattedDeviceInfo}\n`;
    
    const notificationResult = await sendNotification(`Accessed: ${currentPageUrl}`, message);
    
    if (notificationResult.success) {
      res.status(200).json({ message: 'API Status Response: notify API is working!' });
    } else {
      res.status(500).json({ message: 'API Status Response: notify API is not working!', error: notificationResult.error });
    }
    } catch (error) {
      console.error('Error in API handler:', error);
      res.status(500).json({ message: 'Error processing request.' });
    }
  });

app.options('*', cors());

export default (req, res) => {
  app(req, res);
};
