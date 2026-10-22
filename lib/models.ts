import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  displayName: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "user"], default: "user", index: true },
  connectionCode: { type: String, required: true, unique: true, index: true },
  avatar: { type: String, default: "" }, avatarAssetId: { type: String, default: "" },
  email: { type: String, default: "" }, status: { type: String, enum: ["active", "disabled"], default: "active", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" }, lastLoginAt: Date
}, { timestamps: true });
const ConnectionSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  pairKey: { type: String, required: true, unique: true }, status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending", index: true }
}, { timestamps: true });
const GroupSchema = new Schema({
  name: { type: String, required: true }, description: { type: String, default: "" }, avatar: String,
  avatarAssetId: String, members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: Schema.Types.ObjectId, ref: "User" }, status: { type: String, enum: ["active", "archived"], default: "active" }
}, { timestamps: true });
const ConversationSchema = new Schema({
  type: { type: String, enum: ["direct", "group"], required: true, index: true },
  participants: [{ type: Schema.Types.ObjectId, ref: "User" }], groupId: { type: Schema.Types.ObjectId, ref: "Group" },
  directKey: { type: String, unique: true, sparse: true }, lastMessage: String, lastMessageAt: Date
}, { timestamps: true });
const AttachmentSchema = new Schema({
  fileId: { type: Schema.Types.ObjectId, ref: "FileAsset" }, url: String, name: String, mimeType: String, sizeBytes: Number, resourceType: String
}, { _id: false });
const MessageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true }, messageType: { type: String, enum: ["text", "attachment"], default: "text" },
  text: { type: String, default: "", maxlength: 5000 }, attachments: [AttachmentSchema], replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
  editedAt: Date, deletedAt: Date,
  reactions: [{ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, emoji: { type: String, required: true, enum: ["👍", "❤️", "😂", "😮", "😢", "🎉"] } }]
}, { timestamps: true });
const FileAssetSchema = new Schema({
  uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  messageId: { type: Schema.Types.ObjectId, ref: "Message" }, originalFilename: String, mimeType: String,
  resourceType: String, cloudinaryPublicId: { type: String, required: true }, cloudinaryAssetId: String,
  sizeBytes: Number, width: Number, height: Number, duration: Number,
  status: { type: String, enum: ["active", "deletion_pending", "deleted"], default: "active", index: true }, deletedAt: Date
}, { timestamps: true });
const SessionSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, tokenHash: { type: String, required: true, unique: true }, expiresAt: { type: Date, required: true, index: { expires: 0 } } }, { timestamps: true });

export const User = models.User || model("User", UserSchema);
export const Connection = models.Connection || model("Connection", ConnectionSchema);
export const Group = models.Group || model("Group", GroupSchema);
export const Conversation = models.Conversation || model("Conversation", ConversationSchema);
export const Message = models.Message || model("Message", MessageSchema);
export const FileAsset = models.FileAsset || model("FileAsset", FileAssetSchema);
export const Session = models.Session || model("Session", SessionSchema);

const PostSchema = new Schema({
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [{ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, text: { type: String, required: true, maxlength: 500 }, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
export const Post = models.Post || model("Post", PostSchema);
