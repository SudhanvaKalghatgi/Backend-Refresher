import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
 try {
   const user = await User.findById(userId);
   // if(!user){}
   const accessToken = user.generateAccessToken()
   const refreshToken = user.generateRefreshToken()
 
   user.refreshToken = refreshToken
   await user.save({validateBeforeSave: false})
   return {accessToken, refreshToken}
 } catch (error) {
  throw new ApiError(500, "Something went wrong while generating access and refresh token");
 }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  // ✅ Validate required fields
  if (!fullname?.trim() || !email?.trim() || !username?.trim() || !password?.trim()) {
    throw new ApiError(400, "All fields are required");
  }

  // ✅ Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // ✅ Multer files
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  let avatar = null;
  let coverImage = null;

  try {
    // ✅ Upload avatar
    avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
      throw new ApiError(500, "Failed to upload avatar");
    }

    // ✅ Upload cover image only if provided
    if (coverLocalPath) {
      coverImage = await uploadOnCloudinary(coverLocalPath);
    }

    // ✅ Create user
    const user = await User.create({
      fullname,
      email,
      username,
      password,
      avatar: avatar.url, // ✅ MUST
      coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully"));
  } catch (error) {
    console.log("User creation failed:", error.message);

    // ✅ Cleanup cloudinary uploads if DB creation failed
    try {
      if (avatar?.public_id) await deleteFromCloudinary(avatar.public_id);
      if (coverImage?.public_id) await deleteFromCloudinary(coverImage.public_id);
    } catch (cleanupError) {
      console.log("Cloudinary cleanup failed:", cleanupError.message);
    }

    // ✅ Throw final error (asyncHandler will catch it)
    throw new ApiError(500, error.message || "Something went wrong while registering user");
  }
});

const loginUser = asyncHandler(async(req, res) => {
  //get data from body
  const {email, username, password} = req.body;

  //validation
  if (!email) {
    throw new ApiError(400, "Email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  });

  if(!user){
    throw new ApiError(404, "User not found");
  }

  // validate password

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id)
                                  .select( "-password -refreshToken");
                                
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  }
   
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json( new ApiResponse(
      200,
      { user: loggedInUser, accessToken, refreshToken },
      "User logged in successfully"
    ))
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
  req.user._id,
  {
    $set: {
      refreshToken: undefined,
    }
  },
  {new: true} 
)

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }

  return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json( new ApiResponse(200, {}, "User logges out successfully"))
})

const refreshAccessToken = asyncHandler( async(req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (user.refreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token")
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }

   const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)

   return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json( new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token refreshed successfully"))

  } catch (error) {
    throw new ApiError(500, "Something went wrong  while refreshing access token");
  }

})

export { 
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser
 };
