import { ChatGlm6BLLM } from '../chat_models/chatglm-6b'
import { LLMChain } from 'langchain/chains';
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,

} from "langchain/prompts";
import { GlobalService } from 'src/service/global';

export class ChatglmService {
  //获取文档内容
  async chatfileContent(body, knowledgeBase: string) {
    const { message, hyperparameters } = body;
    // 根据知识库选择正确的向量存储
    let vectorStore;
    if (knowledgeBase === '英语') {
      if (!GlobalService.en_globalVar) throw new Error('英语向量存储未初始化');
      vectorStore = GlobalService.en_globalVar;
    } else if (knowledgeBase === '日语') {
      if (!GlobalService.jp_globalVar) throw new Error('日语向量存储未初始化');
      vectorStore = GlobalService.jp_globalVar;
    } else {
      throw new Error(`不支持的知识库: ${knowledgeBase}`);
    }

    const result = await vectorStore.similaritySearch(message, hyperparameters['document_number']);
    
    let fileUrl = []
    let content = []

    for (let i = 0; i < result.length; i++) {
      fileUrl.push(
        '/static/' +
        result[i].metadata.source.split("/")[result[i].metadata.source.split("/").length - 1]
      );
      content.push(result[i].pageContent);
    }

    return {
      content: content,
      url: fileUrl
    }
  }

  // 文档问答
  async chatfile(body, knowledgeBase: string) {
    const { message, history } = body;
    // 根据知识库选择正确的向量存储
    let vectorStore;
    if (knowledgeBase === '英语') {
      if (!GlobalService.en_globalVar) throw new Error('英语向量存储未初始化');
      vectorStore = GlobalService.en_globalVar;
    } else if (knowledgeBase === '日语') {
      if (!GlobalService.jp_globalVar) throw new Error('日语向量存储未初始化');
      vectorStore = GlobalService.jp_globalVar;
    } else {
      throw new Error(`不支持的知识库: ${knowledgeBase}`);
    }

    const result = await vectorStore.similaritySearch(message, 1);
    const fileSourceStr = result[0].metadata.source;
    
    const chat = new ChatGlm6BLLM({ 
      temperature: 0.01, 
      history: history 
    });
    
    const translationPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        `基于已知内容, 回答用户问题。如果无法从中得到答案，请说'没有足够的相关信息'。已知内容:${result[0].pageContent}`
      ),
      HumanMessagePromptTemplate.fromTemplate("{text}"),
    ]);

    const chain = new LLMChain({
      prompt: translationPrompt,
      llm: chat,
    });
    
    const response = await chain.call({
      text: message,
    });
    
    return {
      response: response,
      url: '/static/' + fileSourceStr.split("\\")[fileSourceStr.split("\\").length - 1]
    }
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
