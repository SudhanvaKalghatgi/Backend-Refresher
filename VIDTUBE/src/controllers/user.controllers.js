import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
