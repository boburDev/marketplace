import mongoose, { Document, Schema } from 'mongoose';

interface BonusSystem extends Document {
    path: string;
    userName: string;
    legalId?: mongoose.Types.ObjectId;
    physicalId?: mongoose.Types.ObjectId;
    time?: Date;
}


const bonusSystemSchema: Schema = new Schema({
    path: { type: String, required: true },
    userName: { type: String, required: true },
    legalId: { type: mongoose.Schema.Types.ObjectId, ref: 'LUser', required: false },
    physicalId: { type: mongoose.Schema.Types.ObjectId, ref: 'PUser', required: false },
    time: { type: Date, required: false, default: Date.now },
});

const BonusSystem = mongoose.model<BonusSystem>('BonusSystem', bonusSystemSchema);


interface BonusSystemPicture extends Document {
    bonusSystemId: mongoose.Types.ObjectId;
    path: string;
}

const BonusSystemPictureSchema: Schema = new Schema({
    bonusSystemId: { type: mongoose.Schema.Types.ObjectId, ref: 'BonusSystem', required: true },
    path: { type: String, required: true },
});

const BonusSystemPictureModel = mongoose.model<BonusSystemPicture>('BonusSystemPicture', BonusSystemPictureSchema);


export default BonusSystem;
export { BonusSystem, BonusSystemPictureModel };