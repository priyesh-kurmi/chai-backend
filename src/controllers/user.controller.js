import { asyncHandler } from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


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
            $set: {
                refreshToken: undefined
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

export { 
    registerUser,
    loginUser,
    logoutUser
};