import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireCsrf } from '../../middleware/auth.js';
import { ok, fail } from '../../utils/response.js';

const router = Router();
router.use(requireAuth);
router.get('/',async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1);const [items,unread,total]=await Promise.all([prisma.notification.findMany({where:{userId:req.user.id},orderBy:{createdAt:'desc'},skip:(page-1)*30,take:30,select:{id:true,alertId:true,title:true,body:true,readAt:true,createdAt:true,meta:true}}),prisma.notification.count({where:{userId:req.user.id,readAt:null}}),prisma.notification.count({where:{userId:req.user.id}})]);return ok(res,{items,unread,total,page,pageSize:30});});
router.patch('/:id/read',requireCsrf,async(req,res)=>{const result=await prisma.notification.updateMany({where:{id:req.params.id,userId:req.user.id,readAt:null},data:{readAt:new Date()}});return result.count?ok(res,{read:true}):fail(res,404,'NOT_FOUND','Notification not found');});
router.post('/read-all',requireCsrf,async(req,res)=>{const result=await prisma.notification.updateMany({where:{userId:req.user.id,readAt:null},data:{readAt:new Date()}});return ok(res,{updated:result.count});});
export default router;
