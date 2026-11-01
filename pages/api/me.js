import {requireUser,sendError} from "./_helpers";
export default async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 try{const c=await requireUser(req);return res.json({user:{uid:c.decoded.uid,publicId:c.user.publicId,email:c.user.email,name:c.user.name,photoURL:c.user.photoURL||"",role:c.user.role,credits:c.user.credits||0,createdAt:c.user.createdAt?.toDate?.()?.toISOString()||null}})}
 catch(e){return sendError(res,e)}
}
