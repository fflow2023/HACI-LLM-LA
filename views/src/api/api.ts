//views\src\api\api.ts

import request from './axios'
import { getHistoryList } from './tools'
import axios from 'axios';
import { characterPrompts, CharacterType, RoleType, LanguageType } from '../templates/characterPrompts';

const { post } = axios;

// 静态系统提示词 - 根据语言类型和角色类型动态生成
const getStaticSystemPrompt = (language: LanguageType, role: RoleType): string => {
  if (language === '英语') {
    if (role === 'teacher') {
      return `你是一位在东北大学秦皇岛分校英语教学领域有着深厚学术造诣和丰富教学经验的专家，熟悉该分校的教学体系和学生的学习特点，能够为学生提供针对性的英语学习支持。你具备扎实的英语语言学知识，包括语法、词汇、发音、听力、口语、阅读、写作等各个方面，同时掌握英语教学设计、学习策略制定和问题解决能力，能够结合实际案例进行讲解。为东北大学秦皇岛分校的学生提供专业的英语学习指导，帮助他们理解复杂概念，解决学习难题，提升学习效果，并培养他们的英语思维和跨文化交流能力。`;
    } else {
      return `你是一位东北大学秦皇岛分校的学生，正在学习英语相关课程。你具备一定的英语基础和学习能力，对英语学习充满热情。你善于思考，乐于分享，能够用通俗易懂的方式解释复杂概念。你的目标是帮助其他同学更好地理解英语知识，共同进步。`;
    }
  } else if (language === '日语') {
    if (role === 'teacher') {
      return `你是一位在东北大学秦皇岛分校日语教学领域有着深厚学术造诣和丰富教学经验的专家，熟悉该分校的教学体系和学生的学习特点，能够为学生提供针对性的日语学习支持。你具备扎实的日语语言学知识，包括假名、汉字、语法、词汇、敬语、文化背景等各个方面，同时掌握日语教学设计、学习策略制定和问题解决能力，能够结合实际案例进行讲解。为东北大学秦皇岛分校的学生提供专业的日语学习指导，帮助他们理解复杂概念，解决学习难题，提升学习效果，并培养他们的日语交流能力和跨文化理解。`;
    } else {
      return `你是一位东北大学秦皇岛分校的学生，正在学习日语相关课程。你具备一定的日语基础和学习能力，对日语学习充满热情。你善于思考，乐于分享，能够用通俗易懂的方式解释复杂概念。你的目标是帮助其他同学更好地理解日语知识，共同进步。`;
    }
  }
  return '';
};

export const api = async (data: object): Promise<any> => {
	return await request({
		...data,
	})
}

interface postParams {
	message: string,
	history: string[][],
	stream: boolean,
	character?: CharacterType, // 添加性格类型参数
}

interface remoteapiParams {
	base: string, // 属于哪个机构，目前先去实现silicon flow的接口
	kind: string, // 对话类型，目前先实现chat类型
	methods: string, // 请求方法，目前先实现post类型
	postparams: postParams, // 具体参数
}

type MaxTokensBase = {
	[key: string]: number;
};

let max_tokens_base: MaxTokensBase = {
	"deepseek-ai/DeepSeek-V3": 4096,
	"Qwen/Qwen2.5-7B-Instruct": 4096,
	"deepseek-ai/DeepSeek-R1": 8192,
	"Qwen/QwQ-32B": 8192,
}

// 修改remoteapi函数
export const remoteapi = async (params: remoteapiParams): Promise<any> => {
	let kind = params['kind']
	let base = params['base']
	let methods = params['methods']
	let postparams = params['postparams']
	let stream = postparams['stream']
	let historylist = getHistoryList(params['postparams']['history'])

	// 获取性格类型
	const character = postparams['character'] as CharacterType || '英语-严厉型'
	console.log('Selected character:', character) // 添加日志

	const characterInfo = characterPrompts[character]
	console.log('Character info:', characterInfo) // 添加日志

	// 获取静态系统提示词
	const staticSystemPrompt = getStaticSystemPrompt(characterInfo.language, characterInfo.role)
	console.log('Static system prompt:', staticSystemPrompt) // 添加日志

	// 获取动态性格提示词
	const characterPrompt = characterInfo.prompt
	console.log('Character prompt:', characterPrompt) // 添加日志

	// 组合系统提示词
	const systemPrompt = `${staticSystemPrompt}\n\n${characterPrompt}`
	console.log('Final system prompt:', systemPrompt) // 添加日志

	let systempormpt = [{ content: systemPrompt, role: 'system' }]
	let userinput = [{ content: postparams['message'], role: 'user' }]

	// 目前暂时只实现一种情况
	if (base == 'siliconflow' && kind == 'chat' && methods == 'post') {
		const options = {
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + import.meta.env.VITE_SILICONFLOW_API_KEY,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: import.meta.env.VITE_SILICONFLOW_MODEL,
				stream: stream,
				max_tokens: max_tokens_base[import.meta.env.VITE_SILICONFLOW_MODEL] || 4096,
				temperature: 0.7,
				top_p: 0.7,
				top_k: 50,
				frequency_penalty: 0.5,
				n: 1,
				messages: systempormpt.concat(historylist, userinput)
			})
		};

		console.log(stream)
		if (stream) {
			const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response;
		} else {
			const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			return data;
		}
	}
}

export function* fetchStreamData(postparams: postParams & { signal?: AbortSignal }) {
	let kind = 'chat'
	let base = 'siliconflow'
	let methods = 'post'
	let stream = postparams['stream']
	let historylist = getHistoryList(postparams['history'])

	// 获取性格类型
	const character = postparams['character'] as CharacterType || '英语-严厉型'
	console.log('Selected character:', character) // 添加日志

	const characterInfo = characterPrompts[character]
	console.log('Character info:', characterInfo) // 添加日志

	// 获取静态系统提示词
	const staticSystemPrompt = getStaticSystemPrompt(characterInfo.language, characterInfo.role)
	console.log('Static system prompt:', staticSystemPrompt) // 添加日志

	// 获取动态性格提示词
	const characterPrompt = characterInfo.prompt
	console.log('Character prompt:', characterPrompt) // 添加日志

	// 组合系统提示词
	const systemPrompt = `${staticSystemPrompt}\n\n${characterPrompt}`
	console.log('Final system prompt:', systemPrompt) // 添加日志

	let systempormpt = [{ content: systemPrompt, role: 'system' }]
	let userinput = [{ content: postparams['message'], role: 'user' }]

	// 目前暂时只实现一种情况
	if (base == 'siliconflow' && kind == 'chat' && methods == 'post') {
		const options = {
			method: 'POST',
			headers: {
				Authorization: 'Bearer ' + import.meta.env.VITE_SILICONFLOW_API_KEY,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: import.meta.env.VITE_SILICONFLOW_MODEL,
				stream: stream,
				max_tokens: max_tokens_base[import.meta.env.VITE_SILICONFLOW_MODEL] || 4096,
				temperature: 0.7,
				top_p: 0.7,
				top_k: 50,
				frequency_penalty: 0.5,
				n: 1,
				messages: systempormpt.concat(historylist, userinput)
			})
		};

		console.log(stream)
		if (stream) {
			const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options, { signal: postparams.signal });
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No reader available');
			}

			const decoder = new TextDecoder();
			let buffer = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') {
								return;
							}
							try {
								const parsed = JSON.parse(data);
								yield parsed;
							} catch (e) {
								console.error('Error parsing JSON:', e);
							}
						}
					}
				}
			} finally {
				reader.releaseLock();
			}
		} else {
			const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options, { signal: postparams.signal });
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const data = await response.json();
			yield data;
		}
	}
}
