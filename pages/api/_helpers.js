import {getFirebaseAdmin,requireUser,requireAdmin,sendError} from "../../lib/firebaseAdmin";
export {getFirebaseAdmin,requireUser,requireAdmin,sendError};
export function methodNotAllowed(res,methods){res.setHeader("Allow",methods.join(", "));return res.status(405).json({error:"Method not allowed"});}
export function validPublicHttpsUrl(value){try{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password)return false;const h=u.hostname.toLowerCase();if(h==="localhost"||h.endsWith(".local")||h==="metadata.google.internal"||/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))return false;return true;}catch{return false;}}
