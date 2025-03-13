const Video = require("../../models/video.model");

//import model
const User = require("../../models/user.model");
const SoundList = require("../../models/soundsList.model");
const UserWiseSubscription = require("../../models/userWiseSubscription.model");
const Notification = require("../../models/notification.model");
const SearchHistory = require("../../models/searchHistory.model");
const LikeHistoryOfVideo = require("../../models/likeHistoryOfVideo.model");
const WatchHistory = require("../../models/watchHistory.model");
const SaveToWatchLater = require("../../models/saveToWatchLater.model");
const History = require("../../models/history.model");

//deleteFromSpace
const { deleteFromSpace } = require("../../util/deleteFromSpace");

//private key
const admin = require("../../util/privateKey");

//momemt
const moment = require("moment");

//mongoose
const mongoose = require("mongoose");

//day.js
const dayjs = require("dayjs");

//uuid
const uuid = require("uuid");

//generateUniqueVideoId
const { generateUniqueVideoId } = require("../../util/generateUniqueVideoId");

//generateHistoryUniqueId
const { generateHistoryUniqueId } = require("../../util/generateHistoryUniqueId");

//video Unlocked
exports.unlockPrivateVideo = async (req, res) => {
  try {
    const { userId, videoId } = req.query;

    if (!userId || !videoId) {
      return res.status(200).json({ status: false, message: "Invalid user or video details provided." });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const videoObjectId = new mongoose.Types.ObjectId(videoId);

    const [user, video] = await Promise.all([User.findOne({ _id: userObjectId }), Video.findOne({ _id: videoObjectId, videoPrivacyType: 2 })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "You are blocked by the admin." });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "Video not found." });
    }

    res.status(200).json({
      status: true,
      message: "Video unlocked successfully.",
      isUnlocked: true,
    });

    const [uniqueIdForUser, uniqueIdForVideoUser, videoOwner] = await Promise.all([generateHistoryUniqueId(), generateHistoryUniqueId(), User.findOne({ _id: video.userId })]);

    const unlockCost = videoOwner?.videoUnlockCost;

    await Promise.all([
      Video.findOneAndUpdate({ _id: video._id }, { $set: { videoPrivacyType: 1 } }, { new: true }), // Change video privacy type to public
      User.findOneAndUpdate({ _id: video.userId }, { $inc: { coin: unlockCost } }, { new: true }), // Increase video owner's coin count
      new History({
        userId: video.userId,
        uniqueId: uniqueIdForVideoUser,
        coin: unlockCost,
        type: 9,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(), // Save transaction history for video owner
      User.findOneAndUpdate({ _id: user._id }, { $inc: { coin: -unlockCost } }, { new: true }), // Decrease user's coin count
      new History({
        otherUserId: user._id,
        uniqueId: uniqueIdForUser,
        coin: unlockCost,
        type: 9,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(), // Save transaction history for user
    ]);

    if (user.fcmToken) {
      const adminInstance = await admin;
      const notificationPayload = {
        token: user.fcmToken,
        notification: {
          title: "🔓 Video Unlocked Successfully!",
          body: `You've successfully unlocked the video for ${unlockCost} coins! Enjoy the content! 🎬✨`,
        },
        data: {
          type: "VIDEO_UNLOCKED",
        },
      };

      // Send the notification
      adminInstance
        .messaging()
        .send(notificationPayload)
        .then((response) => {
          console.log("Notification sent successfully: ", response);
        })
        .catch((error) => {
          console.error("Error sending notification: ", error);
        });
    }
  } catch (error) {
    console.error("Error in unlockPrivateVideo: ", error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//channel name verify when upload viodeo or shorts
exports.verifyChannelname = async (req, res) => {
  try {
    if (!req.body.fullName) {
      return res.status(200).json({ status: false, message: "Invalid input. Please provide valid details!" });
    }

    //Check if the new channelName is different from the current one
    const isDuplicateFullName = await User.findOne({ fullName: req.body.fullName.trim() });

    if (isDuplicateFullName) {
      return res.status(200).json({ status: false, message: "This channel name is already taken. Please try another one." });
    } else {
      return res.status(200).json({ status: true, message: "This channel name is available. You may proceed to use it." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//upload (normal videos or shorts) by the user
exports.createVideo = async (req, res) => {
  try {
    if (
      !req.body.title ||
      //!req.body.description ||
      //!req.body.hashTag ||
      !req.body.videoType ||
      !req.body.videoTime ||
      !req.body.visibilityType ||
      !req.body.audienceType ||
      !req.body.commentType ||
      !req.body.scheduleType ||
      //!req.body.location ||
      //!req.body.latitude ||
      //!req.body.longitude ||
      !req.body.userId ||
      !req.body.videoPrivacyType ||
      //!req.body.channelId ||
      !req.body.videoUrl ||
      !req.body.videoImage
    ) {
      if (req.body.videoImage) {
        const urlParts = req?.body?.videoImage?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      if (req.body.videoUrl) {
        const urlParts = req?.body?.videoUrl?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    if (req.body.scheduleType == 1 && !req.body.scheduleTime) {
      if (req.body.videoImage) {
        const urlParts = req?.body?.videoImage?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      if (req.body.videoUrl) {
        const urlParts = req?.body?.videoUrl?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      return res.status(200).json({ status: false, message: "scheduleTime must be required!" });
    }

    if (req.body.videoType == 2) {
      if (settingJSON.durationOfShorts < parseInt(req.body.videoTime)) {
        if (req.body.videoImage) {
          const urlParts = req?.body?.videoImage?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        if (req.body.videoUrl) {
          const urlParts = req?.body?.videoUrl?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        return res.status(200).json({ status: false, message: "your duration of Shorts greater than decided by admin!" });
      }
    }

    if (req?.body?.soundListId) {
      var soundList = await SoundList.findById(req?.body?.soundListId);
      if (!soundList) {
        if (req.body.videoImage) {
          const urlParts = req?.body?.videoImage?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        if (req.body.videoUrl) {
          const urlParts = req?.body?.videoUrl?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        return res.status(200).json({ status: false, message: "soundList does not found!" });
      }
    }

    const [uniqueVideoId, user] = await Promise.all([generateUniqueVideoId(), User.findOne({ _id: req.body.userId, isActive: true, isAddByAdmin: false })]);

    if (!user) {
      if (req.body.videoImage) {
        const urlParts = req?.body?.videoImage?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      if (req.body.videoUrl) {
        const urlParts = req?.body?.videoUrl?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      if (req.body.videoImage) {
        const urlParts = req?.body?.videoImage?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      if (req.body.videoUrl) {
        const urlParts = req?.body?.videoUrl?.split("/");
        const keyName = urlParts?.pop();
        const folderStructure = urlParts?.slice(3)?.join("/");
        await deleteFromSpace({ folderStructure, keyName });
      }

      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const video = new Video();

    if (!user.isChannel) {
      console.log("User don't have channel:  ", req?.body?.channelType);

      if (req.body.fullName && req.body.fullName !== user.fullName) {
        //Check if the new channelName is different from the current one
        const isDuplicateFullName = await User.findOne({ fullName: req.body.fullName.trim() });
        if (isDuplicateFullName) {
          if (req.body.videoImage) {
            const urlParts = req?.body?.videoImage?.split("/");
            const keyName = urlParts?.pop();
            const folderStructure = urlParts?.slice(3)?.join("/");
            await deleteFromSpace({ folderStructure, keyName });
          }

          if (req.body.videoUrl) {
            const urlParts = req?.body?.videoUrl?.split("/");
            const keyName = urlParts?.pop();
            const folderStructure = urlParts?.slice(3)?.join("/");
            await deleteFromSpace({ folderStructure, keyName });
          }

          return res.status(200).json({ status: false, message: "The provided channelName is already in use. Please choose a different one." });
        }

        user.fullName = req.body.fullName ? req.body.fullName.trim() : user.fullName; //channelName
      }

      user.channelId = uuid.v4();
      user.isChannel = true;
      user.channelType = parseInt(req?.body?.channelType) || 1;
      user.subscriptionCost = 10;
      user.videoUnlockCost = 10;

      user.descriptionOfChannel = req.body.descriptionOfChannel ? req.body.descriptionOfChannel : user.descriptionOfChannel;
      user.socialMediaLinks.instagramLink = req.body.instagramLink ? req.body.instagramLink : user.socialMediaLinks.instagramLink;
      user.socialMediaLinks.facebookLink = req.body.facebookLink ? req.body.facebookLink : user.socialMediaLinks.facebookLink;
      user.socialMediaLinks.twitterLink = req.body.twitterLink ? req.body.twitterLink : user.socialMediaLinks.twitterLink;
      user.socialMediaLinks.websiteLink = req.body.websiteLink ? req.body.websiteLink : user.socialMediaLinks.websiteLink;

      video.channelId = user.channelId;
    }

    if (req.body.channelId) {
      console.log("User have channel");

      const channel = await User.findOne({ channelId: user.channelId });
      if (!channel) {
        if (req.body.videoImage) {
          const urlParts = req?.body?.videoImage?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        if (req.body.videoUrl) {
          const urlParts = req?.body?.videoUrl?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        return res.status(200).json({ status: false, message: "Channel does not found!" });
      }

      if (user.channelId !== req.body.channelId) {
        if (req.body.videoImage) {
          const urlParts = req?.body?.videoImage?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        if (req.body.videoUrl) {
          const urlParts = req?.body?.videoUrl?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        return res.status(200).json({ status: false, message: "Video has been uploaded only by own channelId." });
      }

      video.channelId = channel.channelId;
    }

    if (req?.body?.scheduleType) {
      video.scheduleType = req?.body?.scheduleType;

      if (req?.body?.scheduleType == 1) {
        video.scheduleTime = moment(req?.body?.scheduleTime).toISOString(); //e.g."2023-07-11T18:00:00.000Z"
      } else if (req?.body?.scheduleType == 2) {
        video.scheduleTime = "";
      } else {
        if (req.body.videoImage) {
          const urlParts = req?.body?.videoImage?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/");
          await deleteFromSpace({ folderStructure, keyName });
        }

        if (req.body.videoUrl) {
          const urlParts = req?.body?.videoUrl?.split("/");
          const keyName = urlParts?.pop();
          const folderStructure = urlParts?.slice(3)?.join("/"); //Join elements starting from the 4th element
          await deleteFromSpace({ folderStructure, keyName });
        }

        return res.status(200).json({ status: false, message: "scheduleType must be passed valid!" });
      }
    }

    video.title = req?.body?.title.trim();
    video.description = req?.body?.description.trim();
    video.videoType = req?.body?.videoType;
    video.videoTime = req?.body?.videoTime;
    video.videoUrl = req?.body?.videoUrl;
    video.videoImage = req?.body?.videoImage;
    video.visibilityType = req?.body?.visibilityType;
    video.audienceType = req?.body?.audienceType;
    video.commentType = req?.body?.commentType;
    video.scheduleType = req?.body?.scheduleType;
    video.videoPrivacyType = parseInt(req?.body?.videoPrivacyType);

    video.location = req?.body?.location?.toLowerCase();
    video.locationCoordinates.latitude = req?.body?.latitude;
    video.locationCoordinates.longitude = req?.body?.longitude;
    video.soundListId = soundList?._id;
    video.userId = user._id;
    video.isAddByAdmin = false;

    //hashTag
    const multiplehashTag = req.body.hashTag ? req?.body?.hashTag.toString().split(",") : [];
    video.hashTag = multiplehashTag;

    //uniqueVideoId
    video.uniqueVideoId = uniqueVideoId;

    await Promise.all([user.save(), video.save()]);

    const data = await Video.findById(video._id).populate([
      { path: "soundListId", select: "soundTitle soundLink" },
      { path: "userId", select: "fullName nickName" },
    ]);

    res.status(200).json({
      status: true,
      message: "Normal video or shorts has been uploaded by the user!",
      video: data,
    });

    //if user don't have channel then send notification to that user
    if (!user.isChannel) {
      if (user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            title: "🚀 Channel Creation Successful! 🚀",
            body: "Your channel has been successfully created. Start uploading content and turn your creativity into earnings today! 📈",
          },
        };

        adminPromise
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);
          })
          .catch((error) => {
            console.log("Error sending message: ", error);
          });
      }
    }

    //if user subscribed that channel then send notification to that users
    const channelSubscribedByUsers = await UserWiseSubscription.find({ channelId: req.body.channelId, ne: { userId: user._id } }).distinct("userId");
    console.log("channelSubscribedByUsers:         ", channelSubscribedByUsers);

    await Promise.all(
      channelSubscribedByUsers.map(async (userId) => {
        const user = await User.findById(userId);

        //Check if user exists and is not the same as the video uploader
        if (user._id.toString() !== req.body.userId.toString()) {
          const notification = new Notification();
          notification.title = "🔔 New Video Alert! 🔔";
          notification.message = "Hey there! We're excited to share our latest video. Don't miss out Click here to watch the video now!";
          notification.userId = user?._id;
          notification.videoId = video?._id;
          notification.channelImage = channel.image;
          notification.videoImage = video.videoImage;
          await notification.save();

          //checks if the user has an fcmToken
          if (user.fcmToken) {
            const adminPromise = await admin;

            const payload = {
              token: user.fcmToken,
              notification: {
                title: "🔔 New Video Alert! 🔔",
                body: "Hey there! We're excited to share our latest video. Don't miss out Click here to watch the video now!",
              },
            };

            adminPromise
              .messaging()
              .send(payload)
              .then((response) => {
                console.log("Successfully sent with response: ", response);
              })
              .catch((error) => {
                console.log("Error sending message:      ", error);
              });
          }
        }
      })
    );
  } catch (error) {
    if (req.body.videoImage) {
      const urlParts = req?.body?.videoImage?.split("/");
      const keyName = urlParts?.pop();
      const folderStructure = urlParts?.slice(3)?.join("/");
      await deleteFromSpace({ folderStructure, keyName });
    }

    if (req.body.videoUrl) {
      const urlParts = req?.body?.videoUrl?.split("/");
      const keyName = urlParts?.pop();
      const folderStructure = urlParts?.slice(3)?.join("/");
      await deleteFromSpace({ folderStructure, keyName });
    }
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//when user share (normal videos or shorts) then shareCount increased
exports.shareCount = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const [user, video] = await Promise.all([User.findOne({ _id: req.query.userId, isActive: true }), Video.findOne({ _id: req.query.videoId, isActive: true })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!!" });
    }

    video.shareCount += 1;
    await video.save();

    return res.status(200).json({ status: true, message: "When user share video then shareCount increased!", video });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get shorts from home page directly
exports.shortsOfUser = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId) {
      return res.status(200).json({ status: false, message: "userId and videoId must be requried." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    let shorts = await Video.aggregate([
      {
        $match: {
          isActive: true,
          scheduleType: 2,
          visibilityType: 1,
          videoType: 2,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channelId",
          foreignField: "channelId",
          as: "channel",
        },
      },
      {
        $unwind: {
          path: "$channel",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "userwisesubscriptions",
          let: {
            channelId: "$channel.channelId",
            userId: user._id,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                },
              },
            },
          ],
          as: "isSubscribed",
        },
      },
      {
        $lookup: {
          from: "videocomments",
          let: {
            videoId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$recursiveCommentId", null] }],
                },
              },
            },
          ],
          as: "totalComments",
        },
      },
      {
        $lookup: {
          from: "likehistoryofvideos",
          let: {
            videoId: "$_id",
            userId: user._id,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                },
              },
            },
          ],
          as: "likeHistory",
        },
      },
      {
        $unwind: {
          path: "$likeHistory",
          preserveNullAndEmptyArrays: true, //return empty values
        },
      },
      {
        $lookup: {
          from: "watchhistories",
          let: { videoId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$videoId", "$$videoId"] },
              },
            },
          ],
          as: "views",
        },
      },
      {
        $project: {
          like: 1,
          dislike: 1,
          shareCount: 1,
          title: 1,
          videoType: 1,
          videoTime: 1,
          videoUrl: 1,
          videoImage: 1,
          description: 1,
          hashTag: 1,
          userId: 1,
          channelId: 1,
          videoPrivacyType: 1,
          createdAt: 1,
          channelType: "$channel.channelType",
          subscriptionCost: "$channel.subscriptionCost",
          videoUnlockCost: "$channel.videoUnlockCost",
          channelName: "$channel.fullName",
          channelImage: "$channel.image",
          totalComments: { $size: "$totalComments" },
          isSubscribed: {
            $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
          },
          isLike: {
            $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
          },
          isDislike: {
            $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
          },
          views: { $size: "$views" },
        },
      },
      { $skip: (start - 1) * limit },
      { $limit: limit },
    ]);

    // Find the index of the specified videoId
    const videoIndex = shorts.findIndex((short) => short._id.toString() === req.query.videoId);

    // If the videoId is found, move it to the 0th index
    if (videoIndex !== -1) {
      const [movedVideo] = shorts.splice(videoIndex, 1);
      shorts.unshift(movedVideo);
    }

    // Adjust the skip value
    const adjustedStart = videoIndex !== -1 ? 1 : start;

    // Limit the shorts based on the new start value
    shorts = shorts.slice(adjustedStart - 1, adjustedStart - 1 + limit);

    return res.status(200).json({ status: true, message: "Retrive Shorts for user.", shorts });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get all shorts for user (shorts)
exports.getShorts = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, shorts] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Video.aggregate([
        {
          $match: {
            isActive: true,
            scheduleType: 2,
            visibilityType: 1,
            videoType: 2,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: {
            path: "$channel",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $lookup: {
            from: "videocomments",
            let: {
              videoId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$recursiveCommentId", null] }],
                  },
                },
              },
            ],
            as: "totalComments",
          },
        },
        {
          $lookup: {
            from: "likehistoryofvideos",
            let: {
              videoId: "$_id",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "likeHistory",
          },
        },
        {
          $unwind: {
            path: "$likeHistory",
            preserveNullAndEmptyArrays: true, //return empty values
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$_id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            like: 1,
            dislike: 1,
            shareCount: 1,
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            description: 1,
            hashTag: 1,
            userId: 1,
            channelId: 1,
            videoPrivacyType: 1,
            commentType: 1,
            createdAt: 1,
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelName: "$channel.fullName",
            channelImage: "$channel.image",
            totalComments: { $size: "$totalComments" },
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            isLike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
            },
            isDislike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
            },
            views: { $size: "$views" },
          },
        },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    return res.status(200).json({ status: true, message: "Retrive shorts for user.", shorts });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get all normal videos for user (home)
exports.getVideos = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    let now = dayjs();

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, videos] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Video.aggregate([
        {
          $match: {
            isActive: true,
            videoType: 1,
            scheduleType: 2,
            visibilityType: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: {
            path: "$channel",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$_id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            scheduleType: 1,
            scheduleTime: 1,
            userId: 1, //videoUserId
            channelId: 1, //videoChannelId
            videoPrivacyType: 1,
            views: { $size: "$views" },
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelName: "$channel.fullName",
            channelImage: "$channel.image",
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { $skip: (start - 1) * limit },
        { $limit: limit },
        { $sample: { size: limit } },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    return res.status(200).json({ status: true, message: "Retrive videos for the user.", videos: videos });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get channel details of shorts for user
exports.channeldetailsOfShorts = async (req, res) => {
  try {
    if (!req.query.channelId || !req.query.userId || !req.query.start || !req.query.limit) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    const [channel, user, totalShortsOfChannel, isSubscribedChannel] = await Promise.all([
      User.findOne({ channelId: req.query.channelId }),
      User.findOne({ _id: req.query.userId, isActive: true }),
      Video.countDocuments({ channelId: req.query.channelId, videoType: 2 }),
      UserWiseSubscription.findOne({ $and: [{ userId: req.query.userId }, { channelId: req.query.channelId }] }),
    ]);

    if (!channel) {
      return res.status(200).json({ status: false, message: "channel does not found!" });
    }

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const [isSubscribed, channelName, channelImage, totalSubscribers, data] = await Promise.all([
      isSubscribedChannel ? true : false,
      channel.fullName,
      channel.image,
      UserWiseSubscription.countDocuments({ channelId: channel.channelId }),
      Video.aggregate([
        {
          $match: {
            channelId: channel.channelId,
            videoType: 2,
            scheduleType: 2,
            visibilityType: 1,
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            localField: "_id",
            foreignField: "videoId",
            as: "views",
          },
        },
        {
          $project: {
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            channelId: 1,
            createdAt: 1,
            views: { $size: "$views" },
          },
        },
        { $skip: (start - 1) * limit },
        { $limit: limit },
      ]),
    ]);

    return res.status(200).json({
      status: true,
      message: "Retrive particular channel's details for shorts!",
      totalShortsOfChannel: totalShortsOfChannel,
      totalSubscribers: totalSubscribers,
      isSubscribed: isSubscribed,
      channelName: channelName,
      channelImage: channelImage,
      detailsOfShorts: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get type wise videos for user (home)
exports.videosOfHome = async (req, res) => {
  try {
    let now = dayjs();

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    if (!req.query.userId || !req.query.type) {
      return res.status(200).json({ status: false, message: "userId must be requried." });
    }

    const type = req.query.type.trim().toLowerCase();
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    if (type === "all") {
      const [user, videos, shorts] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 1,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: {
              path: "$channel",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              scheduleType: 1,
              scheduleTime: 1,
              videoPrivacyType: 1,
              userId: 1, //videoUserId
              channelId: 1, //videoChannelId
              views: { $size: "$views" },
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: { $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true] },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          { $skip: (start - 1) * limit },
          { $limit: limit },
          { $sample: { size: limit } },
        ]),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 2,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: {
              path: "$channel",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "videocomments",
              let: {
                videoId: "$_id",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$recursiveCommentId", null] }],
                    },
                  },
                },
              ],
              as: "totalComments",
            },
          },
          {
            $lookup: {
              from: "likehistoryofvideos",
              let: {
                videoId: "$_id",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "likeHistory",
            },
          },
          {
            $unwind: {
              path: "$likeHistory",
              preserveNullAndEmptyArrays: true, //return empty values
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              like: 1,
              dislike: 1,
              shareCount: 1,
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              hashTag: 1,
              userId: 1,
              channelId: 1,
              commentType: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              totalComments: { $size: "$totalComments" },
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              isLike: {
                $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
              },
              isDislike: {
                $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
              },
              views: { $size: "$views" },
            },
          },
          { $skip: (start - 1) * limit },
          { $limit: limit },
          { $sample: { size: limit } },
        ]),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found!" });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by admin!" });
      }

      return res.status(200).json({
        status: true,
        message: "Retrive videos for the user!",
        data: {
          videos: videos,
          shorts: shorts,
        },
      });
    } else if (type === "popular") {
      const [user, videos, shorts] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 1,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: {
              path: "$channel",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              scheduleType: 1,
              scheduleTime: 1,
              userId: 1, //videoUserId
              channelId: 1, //videoChannelId
              videoPrivacyType: 1,
              views: { $size: "$views" },
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: { $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true] },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          { $skip: (start - 1) * limit },
          { $limit: limit },
          { $sort: { views: -1 } },
        ]),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 2,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: {
              path: "$channel",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "videocomments",
              let: {
                videoId: "$_id",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$recursiveCommentId", null] }],
                    },
                  },
                },
              ],
              as: "totalComments",
            },
          },
          {
            $lookup: {
              from: "likehistoryofvideos",
              let: {
                videoId: "$_id",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "likeHistory",
            },
          },
          {
            $unwind: {
              path: "$likeHistory",
              preserveNullAndEmptyArrays: true, //return empty values
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              like: 1,
              dislike: 1,
              shareCount: 1,
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              hashTag: 1,
              userId: 1,
              channelId: 1,
              commentType: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              totalComments: { $size: "$totalComments" },
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              isLike: {
                $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
              },
              isDislike: {
                $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
              },
              views: { $size: "$views" },
            },
          },
          { $sort: { views: -1 } },
          { $skip: (start - 1) * limit },
          { $limit: limit },
        ]),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found!" });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by admin!" });
      }

      return res.status(200).json({
        status: true,
        message: "Retrive videos for the user!",
        data: {
          videos: videos,
          shorts: shorts,
        },
      });
    } else if (type === "new") {
      const [user, videos, shorts] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 1,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: {
              path: "$channel",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              scheduleType: 1,
              scheduleTime: 1,
              videoPrivacyType: 1,
              userId: 1, //videoUserId
              channelId: 1, //videoChannelId
              createdAt: 1,
              views: { $size: "$views" },
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: { $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true] },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          { $skip: (start - 1) * limit },
          { $limit: limit },
          { $sort: { createdAt: -1 } },
        ]),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 2,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: {
              path: "$channel",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "videocomments",
              let: {
                videoId: "$_id",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$recursiveCommentId", null] }],
                    },
                  },
                },
              ],
              as: "totalComments",
            },
          },
          {
            $lookup: {
              from: "likehistoryofvideos",
              let: {
                videoId: "$_id",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "likeHistory",
            },
          },
          {
            $unwind: {
              path: "$likeHistory",
              preserveNullAndEmptyArrays: true, //return empty values
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              like: 1,
              dislike: 1,
              shareCount: 1,
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              hashTag: 1,
              userId: 1,
              channelId: 1,
              commentType: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              totalComments: { $size: "$totalComments" },
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              isLike: {
                $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
              },
              isDislike: {
                $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
              },
              views: { $size: "$views" },
            },
          },
          { $sort: { createdAt: -1 } },
          { $skip: (start - 1) * limit },
          { $limit: limit },
        ]),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found!" });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by admin!" });
      }

      return res.status(200).json({
        status: true,
        message: "Retrive videos for the user!",
        data: {
          videos: videos,
          shorts: shorts,
        },
      });
    } else if (type === "publiclive") {
      const [user, publicLive] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        User.aggregate([
          {
            $match: {
              isBlock: false,
              isLive: true,
              _id: { $ne: userId },
            },
          },
          {
            $lookup: {
              from: "liveusers",
              let: { liveUserId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$$liveUserId", "$userId"],
                    },
                  },
                },
              ],
              as: "liveUser",
            },
          },
          {
            $unwind: {
              path: "$liveUser",
              preserveNullAndEmptyArrays: false,
            },
          },
          { $match: { "liveUser.liveType": 1 } },
          {
            $project: {
              _id: 1,
              isLive: 1,
              fullName: 1, //channelName
              nickName: 1,
              image: 1,
              channelId: 1,
              thumbnail: "$liveUser.thumbnail",
              title: "$liveUser.title",
              liveHistoryId: { $cond: [{ $eq: ["$isLive", true] }, "$liveUser.liveHistoryId", null] },
              view: { $cond: [{ $eq: ["$isLive", true] }, "$liveUser.view", 0] },
            },
          },
          { $skip: (start - 1) * limit },
          { $limit: limit },
        ]),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found." });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by the admin!" });
      }

      return res.status(200).json({ status: true, message: "Retrive public live user list.", data: publicLive });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get particular nornmal ( videos or shorts )'s details for user
exports.detailsOfVideo = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId || !req.query.videoType)
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details.",
      });

    let now = dayjs();

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const videoId = new mongoose.Types.ObjectId(req.query.videoId);
    const videoType = Number(req.query.videoType);

    const [user, video, data] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Video.findOne({ _id: videoId, videoType: videoType, isActive: true, scheduleType: 2, visibilityType: 1 }),
      Video.aggregate([
        {
          $match: {
            _id: videoId,
            videoType: videoType,
            scheduleType: 2,
            visibilityType: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: "$channel",
        },
        {
          $lookup: {
            from: "videocomments",
            let: { videoId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$recursiveCommentId", null] }],
                  },
                },
              },
            ],
            as: "totalComments",
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            localField: "channelId",
            foreignField: "channelId",
            as: "totalSubscribers",
          },
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: { channel: "$channelId", user: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$channelId", "$$channel"] }, { $eq: ["$userId", "$$user"] }],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            localField: "_id",
            foreignField: "videoId",
            as: "views",
          },
        },
        {
          $lookup: {
            from: "likehistoryofvideos",
            let: {
              videoId: "$_id",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "likeHistory",
          },
        },
        {
          $unwind: {
            path: "$likeHistory",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$_id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            shareCount: 1,
            userId: 1,
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            description: 1,
            hashTag: 1,
            like: 1,
            dislike: 1,
            videoPrivacyType: 1,
            channelId: 1,
            commentType: 1,
            createdAt: 1,
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelName: "$channel.fullName",
            channelImage: "$channel.image",
            totalComments: { $size: "$totalComments" },
            totalSubscribers: { $size: "$totalSubscribers" },
            views: { $size: "$views" },
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            isLike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "like"] }, true, false],
            },
            isDislike: {
              $cond: [{ $eq: ["$likeHistory.likeOrDislike", "dislike"] }, true, false],
            },
            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found." });
    }

    return res.status(200).json({ status: true, message: "Retrive particular video's details for user.", detailsOfVideo: data[0] });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//create like or dislike for video (normal video or short)
exports.likeOrDislikeOfVideo = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.videoId || !req.query.likeOrDislike) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const [user, video, likedOrDislikedVideo, alreadylikedOrDislikedVideo] = await Promise.all([
      User.findOne({ _id: req.query.userId, isActive: true }),
      Video.findById(req.query.videoId),
      Video.findOne({
        _id: req.query.videoId,
        $or: [{ like: { $gt: 0 } }, { dislike: { $gt: 0 } }],
      }),
      LikeHistoryOfVideo.findOne({
        userId: req.query.userId,
        videoId: req.query.videoId,
        $or: [{ likeOrDislike: "like" }, { likeOrDislike: "dislike" }],
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "video does not found!" });
    }

    if (alreadylikedOrDislikedVideo) {
      if (req.query.likeOrDislike === "like") {
        console.log("like request");

        //If the request is for a like, decrease the dislike count (if any) and increase the like count
        await LikeHistoryOfVideo.deleteOne({
          userId: user._id,
          videoId: video._id,
          channelId: video?.channelId,
          likeOrDislike: "dislike",
        });

        let likeHistory;
        likeHistory = await LikeHistoryOfVideo.findOne({
          userId: user._id,
          videoId: video._id,
          channelId: video?.channelId,
          likeOrDislike: "like",
        });

        if (!likeHistory) {
          likeHistory = new LikeHistoryOfVideo({
            userId: user._id,
            videoId: video._id,
            channelId: video?.channelId,
            likeOrDislike: "like",
          });

          await likeHistory.save();

          //Decrease dislike count if greater than 0
          if (likedOrDislikedVideo.dislike > 0) {
            likedOrDislikedVideo.dislike -= 1;
          }

          likedOrDislikedVideo.like += 1;
          await likedOrDislikedVideo.save();
        }

        res.status(200).json({
          status: true,
          message: "like count increased and dislike count decreased (if any).",
          isLike: true,
        });

        //when user like videos and earn coins
        const uniqueId = await generateHistoryUniqueId();
        const likeVideoRewardCoins = settingJSON.likeVideoRewardCoins;

        const [updatedReceiver, historyEntry] = await Promise.all([
          User.findOneAndUpdate(
            { _id: user._id },
            {
              $inc: {
                coin: likeVideoRewardCoins,
              },
            },
            { new: true }
          ),
          History({
            userId: user._id,
            uniqueId: uniqueId,
            coin: likeVideoRewardCoins,
            type: 7,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          }).save(),
        ]);

        if (user.fcmToken && user.fcmToken !== null) {
          const adminPromise = await admin;

          const payload = {
            token: user.fcmToken,
            notification: {
              title: "👍 You've Earned Coins for Liking a Video! Keep Liking! 💰",
              body: `You've earned ${likeVideoRewardCoins} coins for liking a video! The more you like, the more you earn! 🚀🎬`,
            },
            data: {
              type: "ENGAGEMENT_LIKING_REWARD",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message: ", error);
            });
        }

        const videoUser = await User.findById(video.userId);
        if (videoUser.fcmToken && videoUser.fcmToken !== null) {
          const adminPromise = await admin;

          const payload = {
            token: videoUser.fcmToken,
            notification: {
              title: "🌟 Great News! Someone Liked Your Video! 👍",
              body: `Your video received a new like! 🎥💖 Keep up the great work and continue creating amazing content that your audience loves!`,
            },
            data: {
              type: "VIDEO_LIKING_NOTIFICATION",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message: ", error);
            });
        }
      } else if (req.query.likeOrDislike === "dislike") {
        console.log("dislike request");

        //If the request is for a dislike, decrease the like count (if any) and increase the dislike count
        await LikeHistoryOfVideo.deleteOne({
          userId: user._id,
          videoId: video._id,
          channelId: video.channelId,
          likeOrDislike: "like",
        });

        //Create or update the "dislike" history in LikeHistory table
        let likeHistory;
        likeHistory = await LikeHistoryOfVideo.findOne({
          userId: user._id,
          videoId: video._id,
          channelId: video.channelId,
          likeOrDislike: "dislike",
        });

        if (!likeHistory) {
          likeHistory = new LikeHistoryOfVideo({
            userId: user._id,
            videoId: video._id,
            channelId: video.channelId,
            likeOrDislike: "dislike",
          });

          await likeHistory.save();

          //Decrease like count if greater than 0
          if (likedOrDislikedVideo.like > 0) {
            likedOrDislikedVideo.like -= 1;
          }

          likedOrDislikedVideo.dislike += 1;
          await likedOrDislikedVideo.save();
        }

        res.status(200).json({
          status: true,
          message: "dislike count increased and like count decreased (if any).",
          isLike: false,
        });

        const likeVideoRewardCoins = settingJSON.likeVideoRewardCoins;

        const [updatedReceiver, historyEntry] = await Promise.all([
          User.findOneAndUpdate(
            { _id: user._id, coin: { $gt: 0 } },
            {
              $inc: {
                coin: -likeVideoRewardCoins,
              },
            },
            { new: true }
          ),
          History({
            userId: user._id,
            type: 7,
          }).deleteOne(),
        ]);
      } else {
        return res.status(200).json({ status: false, message: "likeOrDislike must be passed valid." });
      }
    } else {
      console.log("else");

      if (req.query.likeOrDislike === "like") {
        video.like += 1;
        await video.save();

        const likeHistory = new LikeHistoryOfVideo();

        likeHistory.userId = user._id;
        likeHistory.videoId = video._id;
        likeHistory.channelId = video.channelId;
        likeHistory.likeOrDislike = "like";
        await likeHistory.save();

        res.status(200).json({ status: true, message: "likeOrDislike wise like or dislike updated.", isLike: true });

        const uniqueId = await generateHistoryUniqueId();

        const likeVideoRewardCoins = settingJSON.likeVideoRewardCoins;

        const [updatedReceiver, historyEntry] = await Promise.all([
          User.findOneAndUpdate(
            { _id: user._id },
            {
              $inc: {
                coin: likeVideoRewardCoins,
              },
            },
            { new: true }
          ),
          History({
            userId: user._id,
            uniqueId: uniqueId,
            coin: likeVideoRewardCoins,
            type: 7,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          }).save(),
        ]);

        if (user.fcmToken && user.fcmToken !== null) {
          const adminPromise = await admin;

          const payload = {
            token: user.fcmToken,
            notification: {
              title: "👍 You've Earned Coins for Liking a Video! Keep Liking! 💰",
              body: `You've earned ${likeVideoRewardCoins} coins for liking a video! The more you like, the more you earn! 🚀🎬`,
            },
            data: {
              type: "ENGAGEMENT_LIKING_REWARD",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message: ", error);
            });
        }

        const videoUser = await User.findById(video.userId);
        if (videoUser.fcmToken && videoUser.fcmToken !== null) {
          const adminPromise = await admin;

          const payload = {
            token: videoUser.fcmToken,
            notification: {
              title: "🌟 Great News! Someone Liked Your Video! 👍",
              body: `Your video received a new like! 🎥💖 Keep up the great work and continue creating amazing content that your audience loves!`,
            },
            data: {
              type: "VIDEO_LIKING_NOTIFICATION",
            },
          };

          adminPromise
            .messaging()
            .send(payload)
            .then((response) => {
              console.log("Successfully sent with response: ", response);
            })
            .catch((error) => {
              console.log("Error sending message: ", error);
            });
        }
      } else if (req.query.likeOrDislike === "dislike") {
        video.dislike += 1;
        await video.save();

        const likeHistory = new LikeHistoryOfVideo();

        likeHistory.userId = user._id;
        likeHistory.videoId = video._id;
        likeHistory.channelId = video.channelId;
        likeHistory.likeOrDislike = "dislike";
        await likeHistory.save();

        res.status(200).json({ status: true, message: "likeOrDislike wise like or dislike updated", isLike: false });

        const likeVideoRewardCoins = settingJSON.likeVideoRewardCoins;

        const [updatedReceiver, historyEntry] = await Promise.all([
          User.findOneAndUpdate(
            { _id: user._id },
            {
              $inc: {
                coin: -likeVideoRewardCoins,
              },
            },
            { new: true }
          ),
          History({
            userId: user._id,
            type: 7,
          }).deleteOne(),
        ]);
      } else {
        return res.status(200).json({ status: true, message: "likeOrDislike must be passed valid" });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};

//get all more like this (normal videos or shorts)
exports.getAllLikeThis = async (req, res) => {
  try {
    if (!req.query.videoId || !req.query.userId) {
      return res.status(400).json({ status: false, message: "videoId and userId must be required." });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const videoId = new mongoose.Types.ObjectId(req.query.videoId);

    const [user, video] = await Promise.all([User.findOne({ _id: userId, isActive: true }), Video.findById(videoId)]);

    if (!user) {
      return res.status(200).json({ status: false, message: "user does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    if (!video) {
      return res.status(200).json({ status: false, message: "Video does not found." });
    }

    const similarVideos = await Video.find({
      _id: { $ne: video._id },
      videoType: { $eq: video.videoType },
      scheduleType: 2,
    })
      .lean()
      .select("_id title videoImage videoUrl videoTime videoType scheduleType channelId videoPrivacyType userId createdAt");

    const data = await Promise.all(
      similarVideos.map(async (similarVideo) => {
        const [totalViews, user, isSaved, isSubscribedChannel] = await Promise.all([
          WatchHistory.countDocuments({ videoId: similarVideo?._id }),
          User.findById(similarVideo?.userId).select("fullName image channelId"),
          SaveToWatchLater.exists({ userId: userId, videoId: similarVideo._id }),
          UserWiseSubscription.findOne({ userId: userId, channelId: similarVideo.channelId }),
        ]);

        const now = new Date();
        const timeDiff = now - similarVideo?.createdAt;

        const timeAgo =
          timeDiff >= 31536000000
            ? `${Math.floor(timeDiff / 31536000000)} years ago`
            : timeDiff >= 2592000000
              ? `${Math.floor(timeDiff / 2592000000)} months ago`
              : timeDiff >= 604800000
                ? `${Math.floor(timeDiff / 604800000)} weeks ago`
                : timeDiff >= 86400000
                  ? `${Math.floor(timeDiff / 86400000)} days ago`
                  : timeDiff >= 3600000
                    ? `${Math.floor(timeDiff / 3600000)} hours ago`
                    : timeDiff >= 60000
                      ? `${Math.floor(timeDiff / 60000)} minutes ago`
                      : timeDiff >= 1000
                        ? `${Math.floor(timeDiff / 1000)} seconds ago`
                        : "Just now";

        return {
          _id: similarVideo._id,
          title: similarVideo.title,
          videoImage: similarVideo.videoImage,
          videoUrl: similarVideo.videoUrl,
          videoTime: similarVideo.videoTime,
          videoType: similarVideo.videoType,
          channelId: similarVideo.channelId,
          videoPrivacyType: similarVideo.videoPrivacyType,
          user: {
            fullName: user?.fullName,
            image: user?.image,
            channelId: user?.channelId,
            subscriptionCost: user?.subscriptionCost || 0,
            videoUnlockCost: user?.videoUnlockCost || 0,
            channelType: user?.channelType || 0,
          },
          totalViews: totalViews,
          time: timeAgo,
          isSavedToWatchLater: isSaved ? true : false,
          isSubscribedChannel: isSubscribedChannel ? true : false,
        };
      })
    );

    return res.status(200).json({ status: true, message: "Successfully retrieved similar videos.", data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//search (normal videos or shorts) for user
exports.search = async (req, res) => {
  try {
    if (!req.body.searchString || !req.body.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    let now = dayjs();
    const userId = new mongoose.Types.ObjectId(req.body.userId);

    const [user, response] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Video.aggregate([
        {
          $match: {
            isActive: true,
            scheduleType: 2,
            visibilityType: 1,
            $or: [{ title: { $regex: req.body.searchString?.trim(), $options: "i" } }, { description: { $regex: req.body.searchString?.trim(), $options: "i" } }],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: "$channel",
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$_id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            description: 1,
            channelId: 1,
            videoPrivacyType: 1,
            createdAt: 1,
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelName: "$channel.fullName",
            channelImage: "$channel.image",
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            views: { $size: "$views" },
            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]),
      SearchHistory.create({
        userId: userId,
        searchString: req?.body?.searchString,
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    return res.status(200).json({ status: true, message: "Success", searchData: response });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//previous search (normal videos or shorts) for user
exports.searchData = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({
        status: false,
        message: "Oops! Invalid details!",
      });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    const lastSearchedData = await SearchHistory.find({ userId: user.id })
      .sort({ createdAt: -1 }) //Sort by most recently searched
      .limit(20);

    return res.status(200).json({
      status: true,
      message: "Success",
      lastSearchedData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//search shorts for user
exports.searchShorts = async (req, res) => {
  try {
    if (!req.body.searchString || !req.body.userId) {
      return res.status(200).json({
        status: false,
        message: "Oops! Invalid details!",
      });
    }

    let now = dayjs();
    const userId = new mongoose.Types.ObjectId(req.body.userId);

    const [user, response] = await Promise.all([
      User.findOne({ _id: userId, isActive: true }),
      Video.aggregate([
        {
          $match: {
            $and: [
              {
                $or: [{ title: { $regex: req.body.searchString?.trim(), $options: "i" } }, { description: { $regex: req.body.searchString?.trim(), $options: "i" } }],
              },
              { isActive: true },
              { videoType: 2 },
              { scheduleType: 2 },
              { visibilityType: 2 },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "channelId",
            foreignField: "channelId",
            as: "channel",
          },
        },
        {
          $unwind: "$channel",
        },
        {
          $lookup: {
            from: "userwisesubscriptions",
            let: {
              channelId: "$channel.channelId",
              userId: userId,
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSubscribed",
          },
        },
        {
          $lookup: {
            from: "watchhistories",
            let: { videoId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$videoId", "$$videoId"] },
                },
              },
            ],
            as: "views",
          },
        },
        {
          $lookup: {
            from: "savetowatchlaters",
            let: { videoId: "$_id", userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                  },
                },
              },
            ],
            as: "isSaveToWatchLater",
          },
        },
        {
          $project: {
            title: 1,
            videoType: 1,
            videoTime: 1,
            videoUrl: 1,
            videoImage: 1,
            description: 1,
            videoPrivacyType: 1,
            createdAt: 1,
            channelType: "$channel.channelType",
            subscriptionCost: "$channel.subscriptionCost",
            videoUnlockCost: "$channel.videoUnlockCost",
            channelName: "$channel.fullName",
            channelImage: "$channel.image",
            isSubscribed: {
              $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
            },
            views: { $size: "$views" },
            isSaveToWatchLater: {
              $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
            },
            time: {
              $let: {
                vars: {
                  timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                },
                in: {
                  $concat: [
                    {
                      $switch: {
                        branches: [
                          {
                            case: { $gte: ["$$timeDiff", 31536000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 2592000000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 604800000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 86400000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 3600000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 60000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                          },
                          {
                            case: { $gte: ["$$timeDiff", 1000] },
                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                          },
                          { case: true, then: "Just now" },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]),
      SearchHistory.create({
        userId: userId,
        searchString: req?.body?.searchString,
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin." });
    }

    return res.status(200).json({ status: true, message: "Success", searchShortsData: response });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//type wise searching (All OR videos OR shorts)
exports.searchChannelVideoShortsByUser = async (req, res) => {
  try {
    if (!req.query.searchString || !req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    let now = dayjs();
    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const type = req.query.type.trim().toLowerCase();
    const searchString = req.query.searchString.trim();

    if (type === "all") {
      const [user, channel, videos, shorts, historyEntry] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        User.aggregate([
          {
            $match: {
              channelId: { $ne: null },
              fullName: { $regex: searchString, $options: "i" },
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "videos",
              let: {
                channelId: "$channelId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$channelId", "$$channelId"],
                    },
                  },
                },
              ],
              as: "totalVideos",
            },
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              localField: "channelId",
              foreignField: "channelId",
              as: "totalSubscribers",
            },
          },
          {
            $project: {
              channelId: 1,
              fullName: 1,
              image: 1,
              channelType: 1,
              subscriptionCost: 1,
              videoUnlockCost: 1,
              isSubscribed: { $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true] },
              totalVideos: { $size: "$totalVideos" },
              totalSubscribers: { $size: "$totalSubscribers" },
            },
          },
        ]),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 1,
              $or: [{ title: { $regex: searchString, $options: "i" } }, { description: { $regex: searchString, $options: "i" } }],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: "$channel",
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              channelId: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelType: "$channel.channelType",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              views: { $size: "$views" },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ]),
        Video.aggregate([
          {
            $match: {
              isActive: true,
              scheduleType: 2,
              visibilityType: 1,
              videoType: 2,
              $or: [{ title: { $regex: searchString, $options: "i" } }, { description: { $regex: searchString, $options: "i" } }],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: "$channel",
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              channelId: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              views: { $size: "$views" },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ]),
        SearchHistory.create({
          userId: userId,
          searchString: searchString,
        }),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found." });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by admin." });
      }

      return res.status(200).json({
        status: true,
        message: "Success",
        searchData: {
          channel: channel,
          videos: videos,
          shorts: shorts,
        },
      });
    } else if (type === "videos") {
      const [user, shorts, historyEntry] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        Video.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [{ title: { $regex: searchString, $options: "i" } }, { description: { $regex: searchString, $options: "i" } }],
                },
                { isActive: true },
                { videoType: 1 },
                { scheduleType: 2 },
                { visibilityType: 2 },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: "$channel",
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              views: { $size: "$views" },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ]),
        SearchHistory.create({
          userId: userId,
          searchString: req?.body?.searchString,
        }),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found." });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by admin." });
      }

      return res.status(200).json({ status: true, message: "Success", searchData: shorts });
    } else if (type === "shorts") {
      const [user, videos, historyEntry] = await Promise.all([
        User.findOne({ _id: userId, isActive: true }),
        Video.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [{ title: { $regex: searchString, $options: "i" } }, { description: { $regex: searchString, $options: "i" } }],
                },
                { isActive: true },
                { videoType: 2 },
                { scheduleType: 2 },
                { visibilityType: 2 },
              ],
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "channelId",
              foreignField: "channelId",
              as: "channel",
            },
          },
          {
            $unwind: "$channel",
          },
          {
            $lookup: {
              from: "userwisesubscriptions",
              let: {
                channelId: "$channel.channelId",
                userId: userId,
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$channelId", "$$channelId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSubscribed",
            },
          },
          {
            $lookup: {
              from: "watchhistories",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$videoId", "$$videoId"] },
                  },
                },
              ],
              as: "views",
            },
          },
          {
            $lookup: {
              from: "savetowatchlaters",
              let: { videoId: "$_id", userId: userId },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ["$videoId", "$$videoId"] }, { $eq: ["$userId", "$$userId"] }],
                    },
                  },
                },
              ],
              as: "isSaveToWatchLater",
            },
          },
          {
            $project: {
              title: 1,
              videoType: 1,
              videoTime: 1,
              videoUrl: 1,
              videoImage: 1,
              description: 1,
              videoPrivacyType: 1,
              createdAt: 1,
              channelType: "$channel.channelType",
              subscriptionCost: "$channel.subscriptionCost",
              videoUnlockCost: "$channel.videoUnlockCost",
              channelName: "$channel.fullName",
              channelImage: "$channel.image",
              isSubscribed: {
                $cond: [{ $eq: [{ $size: "$isSubscribed" }, 0] }, false, true],
              },
              views: { $size: "$views" },
              isSaveToWatchLater: {
                $cond: [{ $eq: [{ $size: "$isSaveToWatchLater" }, 0] }, false, true],
              },
              time: {
                $let: {
                  vars: {
                    timeDiff: { $subtract: [now.toDate(), "$createdAt"] },
                  },
                  in: {
                    $concat: [
                      {
                        $switch: {
                          branches: [
                            {
                              case: { $gte: ["$$timeDiff", 31536000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 31536000000] } } }, " years ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 2592000000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 2592000000] } } }, " months ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 604800000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 604800000] } } }, " weeks ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 86400000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 86400000] } } }, " days ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 3600000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 3600000] } } }, " hours ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 60000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 60000] } } }, " minutes ago"] },
                            },
                            {
                              case: { $gte: ["$$timeDiff", 1000] },
                              then: { $concat: [{ $toString: { $floor: { $divide: ["$$timeDiff", 1000] } } }, " seconds ago"] },
                            },
                            { case: true, then: "Just now" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ]),
        SearchHistory.create({
          userId: userId,
          searchString: req?.body?.searchString,
        }),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not found." });
      }

      if (user.isBlock) {
        return res.status(200).json({ status: false, message: "you are blocked by admin." });
      }

      return res.status(200).json({ status: true, message: "Success", searchData: videos });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid!" });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//clear all searchHistory for particular user
exports.clearAllSearchHistory = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

    const user = await User.findOne({ _id: req.query.userId, isActive: true });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    const clearSearchHistory = await SearchHistory.deleteMany({ userId: user._id });

    if (clearSearchHistory.deletedCount > 0) {
      return res.status(200).json({
        status: true,
        message: "Successfully cleared all search history for the user!",
      });
    } else {
      return res.status(200).json({
        status: false,
        message: "Search history not found for the user!",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message || "Internal Server Error" });
  }
};
