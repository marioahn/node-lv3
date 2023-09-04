import express from 'express';
import { prisma } from '../utils/prisma/index.js'
import authMiddleware from '../middlewares/auth.middleware.js';
import joi from 'joi'

const router = express.Router();
const createdSchema = joi.object({
  title: joi.string().min(1).required(),
  content: joi.string().min(1).required(),
})


/** 1. 게시글 생성API **/
  // # 412 Title, Content의 형식이 비정상적인 경우 -> catch문으로 넘김
router.post('/posts', authMiddleware, async(req,res) => {
  try {
    const { userId, nickname } = req.user;
    const validation = await createdSchema.validateAsync(req.body);
    const { title, content } = validation;
    
    // 여기까지 왔다 = 에러 전부 해결 -> create수행
    const isCreated = await prisma.posts.create({ data: { UserId: userId, Nickname: nickname, title, content } });

    // # 400 예외 케이스에서 처리하지 못한 에러
    if (!isCreated) {
      return res.status(400).json({ errorMessage: '게시글 작성에 실패하였습니다' });
    }
  
    return res.status(201).json({ message: '게시글 작성에 성공하였습니다' });
  } catch (err) {
    console.log(err)
    console.log(err.message)
    return res.status(412).json({ vaildationError: `제목,내용의 형식이 맞지 않습니다 => ${err.message}` })
  }
});


/** 2. 게시글 전체 조회API **/
router.get('/posts', async(_,res) => {
  try {
    const posts = await prisma.posts.findMany({
      select: {
        postId: true,
        UserId: true,
        Nickname: true,
        title: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({ posts: posts });
  } catch (err) {
    return res.status(400).json({ errorMessage: '게시글 조회에 실패하였습니다' });
  }
});


/** 3. 게시글 상세 조회API **/
router.get('/posts/:postId', async(req,res) => {
  try {
    const { postId } = req.params;

    const post = await prisma.posts.findFirst({
      where: { postId: +postId },
      select: {
        postId: true,
        UserId: true,
        Nickname: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!post) { return res.status(404).json({ errorMessage: '게시글이 존재하지 않습니다' }) };

    return res.status(200).json({ post: post });
  } catch (err) {
    return res.status(400).json({ errorMessage: '게시글 조회에 실패하였습니다' });
  }
});


/** 4. 게시글 수정 API **/
  // *400 에러 경우..면담 후 추가하기 - catch문 뒤에
router.put('/posts/:postId', authMiddleware, async(req,res) => {
  try {
    const { userId } = req.user; // 현재 로그인한 사람의 id
    const { postId } = req.params;
    const validation = await createdSchema.validateAsync(req.body);
    const { title, content } = validation;

    const post = await prisma.posts.findUnique({ where: { postId: +postId } });
    
    // # 403 게시글을 수정할 권한이X? -> 로그인 했어도, 다른 사람이 작성한 게시글은 수정X
    if (post["UserId"] !== userId) { // 왼쪽: 게시글작성한 사람의 id, 오른쪽: 현재 로그인한 사람의 id
      return res.status(403).json({ errorMessage: '게시글 수정 권한이 없습니다' });
    };

    if (!post) { // 존재x의 게시글인 경우
      return res.status(404).json({ errorMessage: '게시글 조회에 실패하였습니다' });
    };

    // 모든 조건을 통과했다면 수정작업 수행
    const isUpdated = await prisma.posts.update({
      data: { title, content },
      where: { postId: +postId }
    });

    if (!isUpdated) {
      return res.status(401).json({ errorMessage: '게시글이 정상적으로 수정되지 않았습니다' });
    };

    return res.status(200).json({ message: '게시글을 수정하였습니다' })
  } catch (err) {
    return res.status(412).json({ vaildationError: `제목,내용의 형식이 맞지 않습니다 => ${err.message}` });
  }
});


/** 5. 게시글 삭제 API **/
router.delete('/posts/:postId', authMiddleware, async(req,res) => {
  try {
    const { userId } = req.user; 
    const { postId } = req.params;

    const post = await prisma.posts.findUnique({ where: { postId: +postId } });

    // # 403 게시글 삭제 권한없는 경우
    if (post["UserId"] !== userId) { 
      return res.status(403).json({ errorMessage: '게시글 삭제 권한이 없습니다' });
    };

    if (!post) {
      return res.status(404).json({ errorMessage: '게시글이 존재하지 않습니다' });
    };

    // 모든 조건을 통과했다면 삭제작업 수행
    const isDeleted = await prisma.posts.delete({ where: { postId: +postId } });
    if (!isDeleted) {
      return res.status(401).json({ errorMessage: '게시글이 정상적으로 삭제되지 않았습니다' });
    }

    return res.status(200).json({ message: '게시글을 삭제하였습니다' });
  } catch (err) {
    return res.status(400).json({ errorMessage: '게시글 삭제에 실패하였습니다' });
  }
});


export default router;