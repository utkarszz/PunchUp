const generateToken = require('../utils/generateToken');

const googleAuthSuccess = async (req, res) => {
  const token = generateToken(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Google authentication successful',
    token,
    user:req.user,
  });
};

module.exports = {
  googleAuthSuccess,
};
