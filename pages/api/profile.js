import {requireUser,sendError,getFirebaseAdmin} from "./_helpers";
export default async function handler(req,res){
 if(req.method!=="PATCH"){res.setHeader("Allow","PATCH");return res.status(405).json({error:"Method not allowed"});}
 try{
  const c=await requireUser(req),name=String(req.body?.name||"").trim(),photoURL=String(req.body?.photoURL||"").trim();
  if(!name||name.length>60)return res.status(400).json({error:"Name must be between 1 and 60 characters."});
  if(photoURL){let u;try{u=new URL(photoURL)}catch{return res.status(400).json({error:"Enter a valid profile image URL."})}if(u.protocol!=="https:"||u.username||u.password||photoURL.length>1500)return res.status(400).json({error:"Profile image must be a valid HTTPS URL."});}
  const a=getFirebaseAdmin(),authPatch={displayName:name};if(photoURL)authPatch.photoURL=photoURL;
  await a.auth().updateUser(c.decoded.uid,authPatch);
  await c.ref.set({name,photoURL,updatedAt:a.firestore.FieldValue.serverTimestamp()},{merge:true});
  return res.json({ok:true,user:{publicId:c.user.publicId,name,photoURL,email:c.user.email,credits:c.user.credits||0}});
 }catch(e){return sendError(res,e)}
}
