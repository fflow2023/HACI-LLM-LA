import { ChatGlm6BLLM } from '../chat_models/chatglm-6b'
import { LLMChain } from 'langchain/chains';
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} from "langchain/prompts";
import { GlobalService } from 'src/service/global';

export class ChatglmService {
  async chatfileContent(body: any, knowledgeBase: 'en' | 'jp') {
    const { message, hyperparameters } = body;
    const docNum = hyperparameters?.['document_number'] || 3;

    // 根据知识库选择向量存储
    let vectorStore;
    if (knowledgeBase === 'en') {
      if (!GlobalService.en_globalVar) throw new Error('英语向量存储未初始化');
      vectorStore = GlobalService.en_globalVar;
    } else if (knowledgeBase === 'jp') {
      if (!GlobalService.jp_globalVar) throw new Error('日语向量存储未初始化');
      vectorStore = GlobalService.jp_globalVar;
    } else {
      throw new Error(`不支持的知识库类型: ${knowledgeBase}`);
    }

    // 执行相似度搜索（带分数）
    const results = await vectorStore.similaritySearchWithScore(message, docNum);

    // 处理结果
    const fileUrls: string[] = [];
    const contents: string[] = [];
    const scores: number[] = [];

    for (let i = 0; i < results.length; i++) {
      const [doc, score] = results[i];
      const source = doc.metadata?.source || '';
      const fileName = source.split('/').pop() || ''; // 提取文件名

      fileUrls.push(`/static/${fileName}`);
      contents.push(doc.pageContent);
      scores.push(score);
    }

    return {
      content: contents,
      url: fileUrls,
      scores,
      knowledgeBase // 返回实际使用的知识库
    };
  }

  async chatfile(body: any, knowledgeBase: 'en' | 'jp') {
    const { message, history } = body;

    // 根据知识库选择向量存储
    let vectorStore;
    if (knowledgeBase === 'en') {
      if (!GlobalService.en_globalVar) throw new Error('英语向量存储未初始化');
      vectorStore = GlobalService.en_globalVar;
    } else if (knowledgeBase === 'jp') {
      if (!GlobalService.jp_globalVar) throw new Error('日语向量存储未初始化');
      vectorStore = GlobalService.jp_globalVar;
    } else {
      throw new Error(`不支持的知识库类型: ${knowledgeBase}`);
    }

    // 检索相关文档
    const results = await vectorStore.similaritySearchWithScore(message, 5);
    if (results.length === 0) {
      throw new Error('没有找到相关文档');
    }

    // 使用所有相关文档内容构建上下文
    const contextText = results
      .map(([doc]) => doc.pageContent)
      .join('\n\n---\n\n');

    // 构建对话模型
    const chat = new ChatGlm6BLLM({
      temperature: 0.01,
      history: history || []
    });

    // 构建提示词
    const promptTemplate = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `请根据以下文档内容回答问题：\n${contextText}\n\n如果无法从文档中得到答案，请回答"没有足够的相关信息"。`
      ),
      HumanMessagePromptTemplate.fromTemplate("{text}"),
    ]);

    const chain = new LLMChain({
      prompt: promptTemplate,
      llm: chat
    });

    // 执行对话
    const response = await chain.call({ text: message });

    // 提取文档来源文件名
    const sources = results.map(([doc]) => {
      const source = doc.metadata?.source || '';
      return '/static/' + source.split('/').pop();
    });

    return {
      answer: response.text,
      urls: sources, // 返回所有相关文档的URL
      knowledgeBase
    };
  }
  // //自由对话
  // async chat(body) {

  //   const { message, history } = body;
  //   const chat = new ChatGlm6BLLM({ temperature: 0.01, history: history });
  //   const translationPrompt = ChatPromptTemplate.fromPromptMessages([
  //     /*   SystemMessagePromptTemplate.fromTemplate(
  //       ), */
  //     /* new MessagesPlaceholder("history"), */
  //     HumanMessagePromptTemplate.fromTemplate("{text}"),
  //   ]);

  //   const chain = new LLMChain({
  //     prompt: translationPrompt,
  //     llm: chat,
  //   });
  //   const response = await chain.call({
  //     text: message,
  //   });


  //   return response
  // }
}