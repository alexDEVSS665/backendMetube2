const Setting = require("../../models/setting.model");

//deleteFromSpace
const { deleteFromSpace } = require("../../util/deleteFromSpace");

//create Setting
exports.store = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(200).json({ status: false, message: "oops ! Invalid details." });
    }

    const setting = new Setting();
    setting.privacyPolicyLink = req.body.privacyPolicyLink;
    await setting.save();

    return res.status(200).json({ status: true, message: "Success", setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//update Setting
exports.update = async (req, res) => {
  try {
    if (!req.query.settingId) {
      return res.status(200).json({ status: false, message: "SettingId must be required." });
    }

    const setting = await Setting.findById(req.query.settingId);
    if (!setting) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    setting.privacyPolicyLink = req.body.privacyPolicyLink ? req.body.privacyPolicyLink : setting.privacyPolicyLink;
    setting.privacyPolicyText = req.body.privacyPolicyText ? req.body.privacyPolicyText : setting.privacyPolicyText;

    setting.zegoAppId = req.body.zegoAppId ? req.body.zegoAppId : setting.zegoAppId;
    setting.zegoAppSignIn = req.body.zegoAppSignIn ? req.body.zegoAppSignIn : setting.zegoAppSignIn;

    setting.stripePublishableKey = req.body.stripePublishableKey ? req.body.stripePublishableKey : setting.stripePublishableKey;
    setting.stripeSecretKey = req.body.stripeSecretKey ? req.body.stripeSecretKey : setting.stripeSecretKey;

    setting.razorPayId = req.body.razorPayId ? req.body.razorPayId : setting.razorPayId;
    setting.razorSecretKey = req.body.razorSecretKey ? req.body.razorSecretKey : setting.razorSecretKey;

    setting.flutterWaveId = req.body.flutterWaveId ? req.body.flutterWaveId : setting.flutterWaveId;

    setting.adminCommissionOfPaidChannel = parseInt(req.body.adminCommissionOfPaidChannel) ? parseInt(req.body.adminCommissionOfPaidChannel) : setting.adminCommissionOfPaidChannel;
    setting.adminCommissionOfPaidVideo = parseInt(req.body.adminCommissionOfPaidVideo) ? parseInt(req.body.adminCommissionOfPaidVideo) : setting.adminCommissionOfPaidVideo;
    setting.durationOfShorts = parseInt(req.body.durationOfShorts) ? parseInt(req.body.durationOfShorts) : setting.durationOfShorts;

    setting.minWithdrawalRequestedAmount = parseInt(req.body.minWithdrawalRequestedAmount) ? parseInt(req.body.minWithdrawalRequestedAmount) : setting.minWithdrawalRequestedAmount;
    setting.earningPerHour = req.body.earningPerHour ? parseInt(req.body.earningPerHour) : setting.earningPerHour;

    setting.minConvertCoin = req.body.minConvertCoin ? parseInt(req.body.minConvertCoin) : setting.minConvertCoin;

    setting.loginRewardCoins = parseInt(req.body.loginRewardCoins) ? parseInt(req.body.loginRewardCoins) : setting.loginRewardCoins;

    setting.referralRewardCoins = req.body.referralRewardCoins ? parseInt(req.body.referralRewardCoins) : setting.referralRewardCoins;

    setting.watchingVideoRewardCoins = req.body.watchingVideoRewardCoins ? parseInt(req.body.watchingVideoRewardCoins) : setting.watchingVideoRewardCoins;
    setting.commentingRewardCoins = req.body.commentingRewardCoins ? parseInt(req.body.commentingRewardCoins) : setting.commentingRewardCoins;
    setting.likeVideoRewardCoins = req.body.likeVideoRewardCoins ? parseInt(req.body.likeVideoRewardCoins) : setting.likeVideoRewardCoins;

    setting.minCoinForCashOut = req.body.minCoinForCashOut ? parseInt(req.body.minCoinForCashOut) : setting.minCoinForCashOut;
    setting.maxAdPerDay = req.body.maxAdPerDay ? parseInt(req.body.maxAdPerDay) : setting.maxAdPerDay;
    setting.minWatchTime = req.body.minWatchTime ? parseInt(req.body.minWatchTime) : setting.minWatchTime;
    setting.minSubScriber = req.body.minSubScriber ? parseInt(req.body.minSubScriber) : setting.minSubScriber;
    setting.adDisplayIndex = req.body.adDisplayIndex ? parseInt(req.body.adDisplayIndex) : setting.adDisplayIndex;
    setting.privateKey = req.body.privateKey ? JSON.parse(req.body.privateKey.trim()) : setting.privateKey;

    await setting.save();

    updateSettingFile(setting);

    return res.status(200).json({
      status: true,
      message: "Setting has been Updated by admin.",
      setting: setting,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//get setting
exports.index = async (req, res) => {
  try {
    const data = global.settingJSON ? global.settingJSON : null;

    return res.status(200).json({ status: true, message: "Success", setting: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//handle setting switch
exports.handleSwitch = async (req, res) => {
  try {
    if (!req.query.settingId || !req.query.type) {
      return res.status(200).json({ status: false, message: "OOps ! Invalid details." });
    }

    const setting = await Setting.findById(req.query.settingId);
    if (!setting) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    if (req.query.type === "stripe") {
      setting.stripeSwitch = !setting.stripeSwitch;
    } else if (req.query.type === "razorPay") {
      setting.razorPaySwitch = !setting.razorPaySwitch;
    } else if (req.query.type === "flutterWave") {
      setting.flutterWaveSwitch = !setting.flutterWaveSwitch;
    } else if (req.query.type === "googlePlaySwitch") {
      setting.googlePlaySwitch = !setting.googlePlaySwitch;
    } else if (req.query.type === "monetization") {
      setting.isMonetization = !setting.isMonetization;
    } else {
      return res.status(200).json({ status: false, message: "type passed must be valid." });
    }

    await setting.save();

    updateSettingFile(setting);

    return res.status(200).json({ status: true, message: "Success", setting: setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

//handle water mark setting
exports.updateWatermarkSetting = async (req, res) => {
  try {
    if (!req.body.settingId || !req.body.watermarkType) {
      return res.status(200).json({ status: false, message: "Invalid details!" });
    }

    const setting = await Setting.findById(req.body.settingId);
    if (!setting) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    const watermarkType = parseInt(req.body.watermarkType);

    if (watermarkType === 1) {
      if (!req.body.watermarkIcon) {
        return res.status(200).json({ status: false, message: "watermarkIcon must be requried." });
      }

      setting.watermarkType = 1;
      setting.isWatermarkOn = true;
      setting.watermarkIcon = req.body.watermarkIcon;
    }

    if (watermarkType === 2) {
      if (setting.watermarkIcon) {
        const urlParts = setting?.watermarkIcon?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");

        await deleteFromSpace({ folderStructure, keyName });
      }

      setting.watermarkType = 2;
      setting.isWatermarkOn = false;
      setting.watermarkIcon = "";
    }

    await setting.save();

    updateSettingFile(setting);

    return res.status(200).json({
      status: true,
      message: "Setting has been Updated by admin.",
      setting: setting,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
