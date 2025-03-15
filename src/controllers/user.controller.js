import { asyncHandler } from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //we'll save tokens in db so that we don't have to ask user for tokens to check active session.
        user.refreshToken = refreshToken;
        await user.save( {validateBeforeSave: false} );

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

const registerUser = asyncHandler( async (req, res) => {

    //1 get user details from frontend
    //2 validation - not empty
    //3 check if user already exists: username, email
    //4 check for images, check for avatar
    //5 upload them to cloudinary
    //6 create user object - create entry in db
    //7 remove password and refresh token field from response
    //8 check for user creation
    //9 return response 

    //1
    const {fullName, email, username, password} = req.body
    // console.log("email: ", email);


    //2
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }


    //3
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }
    // console.log(req.files);

    //4
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file are required");
    }
    

    //5
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar){
        throw new ApiError(400, "Avatar file are required");
    }

    //6
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //7
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    //8
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while regestering user");
    }

    //9
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );

})

const loginUser = asyncHandler( async (req, res) => {
    //1 req.body -> data
    //2 username or email
    //3 find the user
    //4 password check
    //5 generate access and refresh token
    //6 send cookie

    //1
    const {email, username, password} = req.body;

    //2
    if (!email && !username) {
        throw new ApiError(400, "Email or username is required");
    }

    //3
    const user = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    //4
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    //5
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    //6
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            }, 
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookes.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken: newRefreshToken
                },
                "Token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "Current User fetched successfully")
    )
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const {fullName, email} = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    //To-Do: delete old image - homework 

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.coverImage[0]?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image");
    }

    const user = await User.getByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $loopup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subsribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { 
                    $size: "$subscribers" 
                },
                channelsSubscribedToCount: { 
                    $size: "$subscribedTo" 
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    console.log(channel);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel fetched successfully")
    )

})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { 
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user[0]?.watchHistory, 
            "Watch history fetched successfully"
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};