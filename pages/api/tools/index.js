import { requireUser, sendError, getFirebaseAdmin } from "../_helpers";
import { publicTool } from "../../../lib/toolSchema";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    await requireUser(req);
    const snapshot = await getFirebaseAdmin().firestore()
      .collection("tools").where("enabled", "==", true).get();
    const tools = snapshot.docs.map(doc => publicTool(doc.id, doc.data()));
    return res.json({ tools });
  } catch (error) {
    return sendError(res, error);
  }
}
