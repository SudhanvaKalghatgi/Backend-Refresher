import mongoose, {Schema} from "mongoose";

const subscriptionModel = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId, // One who is SUBSCRIBING
            ref: "User"
        },
        channel: {
            type: Schema.Types.ObjectId, // One to whom `subscriber` is SUBSCRIBING
            ref: "User"
        },
    },
    {
        timestamps: true
    }
);

export const Subscription = mongoose.model("Subscription", subscriptionModel)
