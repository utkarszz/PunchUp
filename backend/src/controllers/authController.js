const generateToken = require('../utils/generateToken');

const googleAuthSuccess = async (req, res) => {
  const token = generateToken(req.user._id);

  res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
};

module.exports = {
  googleAuthSuccess,
};
