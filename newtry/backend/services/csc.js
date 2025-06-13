const axios = require('axios');
const qs = require('qs');

const getAccessTokenFromCSC = async (code) => {
  console.log('📥 Starting CSC token exchange with code:', code);

  const data = qs.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.CSC_REDIRECT_URI,
    client_id: process.env.CSC_CLIENT_ID,
    client_secret: process.env.CSC_CLIENT_SECRET,
  });

  console.log('🔐 Sending to CSC token endpoint:', {
    client_id: process.env.CSC_CLIENT_ID,
    redirect_uri: process.env.CSC_REDIRECT_URI
  });

  const response = await axios.post(
    'https://connectuat.csccloud.in/account/token',
    data,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const accessToken = response.data.access_token;

  const userResponse = await axios.get(
    'https://connectuat.csccloud.in/account/resource',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return {
    accessToken,
    user: userResponse.data.User,
  };
};

module.exports = { getAccessTokenFromCSC };
