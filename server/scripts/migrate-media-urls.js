require("dotenv").config();
const mongoose = require("mongoose");
const { fields, relativeUploadUrl, writeBackup } = require("../utils/migrateMediaUrls");
const models = { Post: require("../models/Post"), Story: require("../models/Story"), Message: require("../models/Message"), User: require("../models/User") };

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const dbName = mongoose.connection.name;
    console.log(`Connected database: ${dbName}`);
    const apply = process.argv.includes("--apply");
    const backupDirIndex = process.argv.indexOf("--backup-dir");
    const backupDir = backupDirIndex >= 0 ? process.argv[backupDirIndex + 1] : null;
    if (backupDirIndex >= 0 && (!backupDir || !apply)) throw new Error("--backup-dir requires --apply and a directory path.");
    if (apply && !dbName.toLowerCase().includes("demo") && !process.argv.includes("--i-know-this-is-not-demo")) {
        throw new Error("Refusing --apply: database name must contain 'demo' or pass --i-know-this-is-not-demo.");
    }
    const changes = [];
    for (const [modelName, keys] of Object.entries(fields)) {
        const collection = models[modelName].collection;
        for (const key of keys) {
            const cursor = collection.find({ [key]: /^https?:\/\//i });
            let count = 0; const examples = [];
            for await (const doc of cursor) {
                const value = relativeUploadUrl(doc[key]);
                if (!value) continue;
                count++;
                if (examples.length < 3) examples.push({ id: doc._id, from: doc[key], to: value });
                if (apply) changes.push({ collection, modelName, key, doc, value });
            }
            console.log(`${modelName}.${key}: ${count} ${apply ? "updated" : "would update"}`, examples);
        }
    }
    if (backupDir) await writeBackup(backupDir, changes.map(({ modelName, key, doc }) => ({ collection: modelName, _id: doc._id, [key]: doc[key] })));
    for (const { collection, doc, key, value } of changes) await collection.updateOne({ _id: doc._id }, { $set: { [key]: value } });
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
