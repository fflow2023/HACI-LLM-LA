import { ChatGlm6BLLM } from '../chat_models/chatglm-6b'
import { LLMChain } from 'langchain/chains';
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,

} from "langchain/prompts";
import { GlobalService } from 'src/service/global';

export class ChatglmService {
  //只获取文档内容
  async chatfileContent(body) {
    const startTime = Date.now(); // 性能计时开始
    console.log('【chatfileContent】==== 文档检索开始 ====');

    try {
      // 解构请求参数
      const { message, hyperparameters } = body;
      
      // 参数验证调试
      console.log('【调试】step1: 接收参数');
      console.log(`  > 用户查询: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
      console.log(`  > 字符长度: ${message.length}`);
      
      // 解析 hyperparameters
      const docNum = hyperparameters?.['document_number'] || 2;
      console.log(`  > 请求文档切片数: ${docNum}`);
      
      // 验证向量存储库状态
      console.log('【调试】step2: 检查向量存储状态');
      if (!GlobalService.globalVar) {
        const errorMsg = '向量存储未初始化!';
        console.error(`  ${errorMsg}`);
        throw new Error(errorMsg);
      }
      console.log('  √ 向量存储已初始化');
      
      const vectorStore = GlobalService.globalVar;
      
      // 向量存储健康检查
      const vectorCount = vectorStore.memoryVectors?.length || 0;
      console.log(`  > 向量库状态: ${vectorCount}个文档切片`);
      
      if (vectorCount === 0) {
        const errorMsg = '向量库为空，无法检索';
        console.error(`  ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // 执行相似度搜索
      console.log('【调试】step3: 执行相似度搜索');
      const searchStart = Date.now();
      const result = await vectorStore.similaritySearch(message, docNum);
      const searchDuration = Date.now() - searchStart;
      
      console.log(`  √ 搜索完成 (耗时: ${searchDuration}ms)`);
      console.log(`  > 返回结果数: ${result.length}`);
      
      // 详细分析搜索结果
      console.log('【调试】step4: 搜索结果分析');
      if (result.length > 0) {
        console.log('  搜索结果明细:');
        result.forEach((doc, i) => {
          const sourceFile = doc.metadata?.source || '未知来源';
          const fileName = sourceFile.split('/').pop();
          const contentPreview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ') + '...';
          
          // 相关度评分（如有）
          const score = doc.score !== undefined ? ` 评分: ${doc.score.toFixed(3)}` : '';
          
          console.log(`  [${i + 1}] 来源: ${fileName} | 长度: ${doc.pageContent.length}字符${score}`);
          console.log(`      内容预览: ${contentPreview}`);
        });
      } else {
        console.warn('  ⚠️ 未找到匹配的文档切片');
      }
      
      // 处理结果
      console.log('【调试】step5: 处理检索结果');
      const fileUrl = [];
      const content = [];
      
      for (let i = 0; i < result.length; i++) {
        const sourcePath = result[i].metadata.source;
        const fileName = sourcePath.split("/").pop();
        const docContent = result[i].pageContent;
        
        fileUrl.push('/static/' + fileName);
        content.push(docContent);
        
        // 调试输出每个文件的处理
        console.log(`  > 处理切片${i + 1}: ${fileName} (${docContent.length}字符)`);
      }
      
      // 最终结果统计
      const totalChars = content.reduce((sum, text) => sum + text.length, 0);
      console.log('【调试】处理完成统计:');
      console.log(`  > 返回切片数: ${content.length}`);
      console.log(`  > 总字符数: ${totalChars}字符`);
      console.log(`  > 平均切片长度: ${Math.round(totalChars / content.length)}字符`);
      
      const totalDuration = Date.now() - startTime;
      console.log('【chatfileContent】==== 文档检索结束 ====');
      console.log(`  总耗时: ${totalDuration}ms`);
      
      return {
        content: content,
        url: fileUrl
      };
      
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error('【错误】文档检索失败:', error);
      console.log('【chatfileContent】==== 检索异常结束 ====');
      console.log(`  异常耗时: ${errorTime}ms`);
      
      throw error; // 重新抛出错误，由上层处理
    }
  }


  //文档问答
  // chatglm.ts 优化版本
  async chatfile(body) {
    const { message } = body;

    console.log('【查询调试】开始处理用户问题:', message);

    // 1. 获取向量存储
    if (!GlobalService.globalVar) {
      throw new Error('向量存储未初始化');
    }
    const vectorStore = GlobalService.globalVar;

    // 2. 增强检索
    const TOP_K = 3;
    const MIN_SCORE = 0.7;

    // 兼容性检索
    let resultsWithScore: [any, number][];
    if (typeof vectorStore.similaritySearchWithScore === 'function') {
      resultsWithScore = await vectorStore.similaritySearchWithScore(message, TOP_K);
    } else {
      // 旧版兼容：使用简单搜索并赋值默认分数
      const docs = await vectorStore.similaritySearch(message, TOP_K);
      resultsWithScore = docs.map(doc => [doc, 1.0]);
    }

    const relevantResults = resultsWithScore
      .filter(([_, score]) => score >= MIN_SCORE)
      .map(([doc]) => doc);

    // 3. 上下文处理
    const contextText = relevantResults.length > 0
      ? relevantResults.map(doc => doc.pageContent).join('\n\n---\n\n')
      : "没有找到相关信息";

    // 4. 增强提示工程
    const SYSTEM_PROMPT = `
    # 角色：基于知识的专业助手
    # 上下文：
    ${contextText}
    
    # 指令：
    1. 如果上下文包含答案，直接从上下文提取并简洁回答
    2. 如果上下文不足，回答"没有足够的相关信息"
    3. 禁止编造上下文之外的事实
    `;

    // 5. 生成回答（兼容旧版和现代prompt模板）
    const chat = new ChatGlm6BLLM({ temperature: 0.2 });

    let prompt;
    if ('fromMessages' in ChatPromptTemplate) {
      // 现代版本支持 fromMessages
      prompt = (ChatPromptTemplate as any).fromMessages([
        ['system', SYSTEM_PROMPT],
        ['human', '{text}']
      ]);
    } else {
      // 旧版兼容方案
      prompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT),
        HumanMessagePromptTemplate.fromTemplate("{text}")
      ]);
    }

    const chain = new LLMChain({ prompt, llm: chat });
    const response = await chain.call({ text: message });

    // 6. 返回丰富结果
    return {
      answer: response.text,
      contexts: relevantResults.map((doc, idx) => ({
        content: doc.pageContent.substring(0, 200) + '...',
        source: doc.metadata.source,
        score: resultsWithScore[idx][1] // 获取对应分数
      }))
    };
  }


  //自由对话
  async chat(body) {

    const { message, history } = body;
    const chat = new ChatGlm6BLLM({ temperature: 0.01, history: history });
    const translationPrompt = ChatPromptTemplate.fromPromptMessages([
      /*   SystemMessagePromptTemplate.fromTemplate(
        ), */
      /* new MessagesPlaceholder("history"), */
      HumanMessagePromptTemplate.fromTemplate("{text}"),
    ]);

    const chain = new LLMChain({
      prompt: translationPrompt,
      llm: chat,
    });
    const response = await chain.call({
      text: message,
    });


    return response
  }
}
