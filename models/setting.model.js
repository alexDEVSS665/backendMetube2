//Mongoose
const mongoose = require("mongoose");

//Setting Schema
const settingSchema = new mongoose.Schema(
  {
    googlePlaySwitch: { type: Boolean, default: false },

    stripeSwitch: { type: Boolean, default: false },
    stripePublishableKey: { type: String, default: "STRIPE PUBLISHABLE KEY" },
    stripeSecretKey: { type: String, default: "STRIPE SECRET KEY" },

    razorPaySwitch: { type: Boolean, default: false },
    razorPayId: { type: String, default: "RAZOR PAY ID" },
    razorSecretKey: { type: String, default: "RAZOR SECRET KEY" },

    flutterWaveId: { type: String, default: "FLUTTER WAVE ID" },
    flutterWaveSwitch: { type: Boolean, default: false },

    privacyPolicyLink: { type: String, default: "PRIVACY POLICY LINK" },
    privacyPolicyText: { type: String, default: "PRIVACY POLICY TEXT" },

    zegoAppId: { type: String, default: "ZEGO APP ID" },
    zegoAppSignIn: { type: String, default: "ZEGO APP SIGN IN" },

    adminCommissionOfPaidChannel: { type: Number, default: 0 }, //that value always in percentage
    adminCommissionOfPaidVideo: { type: Number, default: 0 }, //that value always in percentage
    durationOfShorts: { type: Number, default: 0 }, //that value always save in millisecond

    minCoinForCashOut: { type: Number, default: 0 }, //min coin requried for convert coin to default currency i.e., 1000 coin = 1 $
    maxAdPerDay: { type: Number, default: 1 },

    //Referral Setting
    referralRewardCoins: { type: Number, default: 100 },

    //engagement setting
    watchingVideoRewardCoins: { type: Number, default: 100 },
    commentingRewardCoins: { type: Number, default: 100 },
    likeVideoRewardCoins: { type: Number, default: 100 },

    //loginReward setting
    loginRewardCoins: { type: Number, default: 100 },

    currency: {
      name: { type: String, default: "", unique: true },
      symbol: { type: String, default: "", unique: true },
      countryCode: { type: String, default: "" },
      currencyCode: { type: String, default: "" },
      isDefault: { type: Boolean, default: false },
    }, //default currency

    //withdrawal setting
    minWithdrawalRequestedAmount: { type: Number, min: 0, default: 0 },
    minConvertCoin: { type: Number, min: 0, default: 0 },

    //monetization setting
    earningPerHour: { type: Number, min: 0, default: 0 }, //earning with default currency
    isMonetization: { type: Boolean, default: false },
    minWatchTime: { type: Number, default: 0 }, //that value always in hours
    minSubScriber: { type: Number, default: 0 },
    adDisplayIndex: { type: Number, default: 0 }, //it represents the index at which ads should be displayed

    privateKey: { type: Object, default: {} }, //firebase.json handle notification

    watermarkType: { type: Number, enum: [1, 2] }, //1.active 2.inactive
    isWatermarkOn: { type: Boolean, default: false },
    watermarkIcon: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Setting", settingSchema);
