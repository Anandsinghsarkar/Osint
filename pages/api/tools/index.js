import { requireUser, sendError, getFirebaseAdmin } from "../_helpers";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    await requireUser(req);
    const snapshot = await getFirebaseAdmin().firestore()
      .collection("tools").where("enabled", "==", true).get();
    const tools = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: String(data.name || "").slice(0, 100),
        description: String(data.description || "").slice(0, 500),
        method: data.method === "POST" ? "POST" : "GET",
        cost: Math.max(1, Math.min(10000, Math.floor(Number(data.cost) || 1)))
      };
    });
    return res.json({ tools });
  } catch (error) {
    return sendError(res, error);
  }
}
