/**
 * One-time migration: set every question in the library to the default scoring
 * (+10 for a correct answer, -5 for a wrong answer).
 *
 * Usage (from /server):
 *   npm run migrate:question-scores                      # dry run
 *   npm run migrate:question-scores -- --apply           # fill only missing / 0 values
 *   npm run migrate:question-scores -- --apply --all     # overwrite EVERY question
 *                                                        # (erases custom scores!)
 */
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Question } from "../modules/questions/models/question.model";
import {
  DEFAULT_CORRECT_POINTS,
  DEFAULT_WRONG_PENALTY,
} from "../modules/questions/constants";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const apply = process.argv.includes("--apply");
const overwriteAll = process.argv.includes("--all");

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set");

  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  // Default: only questions still on the old defaults (no wrongPenalty, or score 0/missing).
  // --all: force every question to the defaults (used once for the initial switch).
  const filter = overwriteAll
    ? {
        $or: [
          { score: { $ne: DEFAULT_CORRECT_POINTS } },
          { wrongPenalty: { $ne: DEFAULT_WRONG_PENALTY } },
        ],
      }
    : {
        $or: [
          { score: { $in: [0, null] } },
          { score: { $exists: false } },
          { wrongPenalty: { $exists: false } },
          { wrongPenalty: null },
        ],
      };
  console.log(overwriteAll ? "Mode: overwrite ALL questions" : "Mode: fill missing/zero values only");

  const total = await Question.countDocuments({});
  const toChange = await Question.countDocuments(filter);
  console.log(
    `Questions: ${total} total, ${toChange} need updating to +${DEFAULT_CORRECT_POINTS} / -${DEFAULT_WRONG_PENALTY}`,
  );

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write changes.");
    return;
  }

  if (overwriteAll) {
    const result = await Question.updateMany(filter, {
      $set: { score: DEFAULT_CORRECT_POINTS, wrongPenalty: DEFAULT_WRONG_PENALTY },
    });
    console.log(`Updated ${result.modifiedCount} questions.`);
    return;
  }
  // Fill each field only where it is missing/zero, keeping any custom values.
  const scoreResult = await Question.updateMany(
    { $or: [{ score: { $in: [0, null] } }, { score: { $exists: false } }] },
    { $set: { score: DEFAULT_CORRECT_POINTS } },
  );
  const penaltyResult = await Question.updateMany(
    { $or: [{ wrongPenalty: { $exists: false } }, { wrongPenalty: null }] },
    { $set: { wrongPenalty: DEFAULT_WRONG_PENALTY } },
  );
  console.log(
    `Updated score on ${scoreResult.modifiedCount} and wrongPenalty on ${penaltyResult.modifiedCount} questions.`,
  );
};

run()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
