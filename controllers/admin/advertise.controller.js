const Advertise = require("../../models/advertise.model");

//create advertise
exports.store = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const advertise = new Advertise();
    advertise.android.google.interstitial = req.body.androidGoogleInterstitial;
    await advertise.save();

    return res.status(200).json({
      status: true,
      message: "Advertise create Successfully",
      advertise,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};

//update advertise
exports.update = async (req, res) => {
  try {
    const adId = req.query.adId;
    if (!adId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const advertise = await Advertise.findById(adId);
    if (!advertise) {
      return res.status(200).json({ status: false, message: "Advertise does not found." });
    }

    advertise.android.google.interstitial = req.body.androidGoogleInterstitial ? req.body.androidGoogleInterstitial : advertise.android.google.interstitial;
    advertise.android.google.native = req.body.androidGoogleNative ? req.body.androidGoogleNative : advertise.android.google.native;
    advertise.android.google.reward = req.body.androidGoogleReward ? req.body.androidGoogleReward : advertise.android.google.reward;
    advertise.ios.google.interstitial = req.body.iosGoogleInterstitial ? req.body.iosGoogleInterstitial : advertise.ios.google.interstitial;
    advertise.ios.google.native = req.body.iosGoogleNative ? req.body.iosGoogleNative : advertise.ios.google.native;
    advertise.ios.google.reward = req.body.iosGoogleReward ? req.body.iosGoogleReward : advertise.ios.google.reward;

    await advertise.save();

    return res.status(200).json({
      status: true,
      message: "Advertise updated Successfully",
      advertise,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server error",
    });
  }
};

//get advertise
exports.get = async (req, res) => {
  try {
    const advertise = await Advertise.findOne().sort({ createdAt: -1 });
    if (!advertise) {
      return res.status(200).json({ status: false, message: "advertise does not found." });
    }

    return res.status(200).json({
      status: true,
      message: "Advertise fetch Successfully",
      advertise,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//handle activation of the switch
exports.handleSwitchForAd = async (req, res) => {
  try {
    const adId = req.query.adId;
    if (!adId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!!" });
    }

    const advertise = await Advertise.findById(adId);
    if (!advertise) {
      return res.status(200).json({ status: false, message: "advertise does not found." });
    }

    advertise.isGoogle = !advertise.isGoogle;
    await advertise.save();

    return res.status(200).json({
      status: true,
      message: "Advertise updated Successfully",
      advertise,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};
