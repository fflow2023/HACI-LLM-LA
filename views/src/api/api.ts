//views\src\api\api.ts

import request from './axios'
import { getHistoryList } from './tools'
import axios from 'axios';
import { characterPrompts, CharacterType, RoleType } from '../templates/characterPrompts';

const { post } = axios;

// 静态系统提示词
const staticSystemPrompts = {
  teacher: `你是一位在东北大学秦皇岛分校{language}教学领域有着深厚学术造诣和丰富教学经验的专家，熟悉该分校的教学体系和学生的学习特点，能够为学生提供针对性的{language}学习支持。你具备{language}教学核心理论知识，包括语法、词汇、发音和文化背景等，同时掌握教学设计、学习策略制定和问题解决能力，能够结合实际案例进行讲解。为东北大学秦皇岛分校的学生提供专业的{language}学习指导，帮助他们理解复杂概念，解决学习难题，提升学习效果，并培养他们的跨文化交际能力和{language}实践能力。`,
  student: `你是一位东北大学秦皇岛分校的学生，正在学习{language}课程。你具备一定的{language}基础和学习能力，对{language}学习充满热情。你善于思考，乐于分享，能够用通俗易懂的方式解释{language}知识点。你的目标是帮助其他同学更好地理解{language}知识，共同进步。`
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
	"deepseek-ai/DeepSeek-V3.1": 4096,
	"deepseek-ai/DeepSeek-V3": 4096,
	"Qwen/Qwen2.5-7B-Instruct": 4096,
	"deepseek-ai/DeepSeek-R1": 8192,
	"Qwen/QwQ-32B": 8192,
}

// 修改remoteapi函数
export const remoteapi = async (params: remoteapiParams, language: string): Promise<any> => {
	let kind = params['kind']
	let base = params['base']
	let methods = params['methods']
	let postparams = params['postparams']
	let stream = postparams['stream']
	let historylist = getHistoryList(params['postparams']['history'])

	// 获取性格类型
	const character = postparams['character'] as CharacterType || 'strict'
	console.log('Selected character:', character) // 添加日志

	const characterInfo = characterPrompts[character]
	console.log('Character info:', characterInfo) // 添加日志


	// 获取静态系统提示词
	const staticSystemPrompt = staticSystemPrompts[characterInfo.role].replace(/\{language\}/g, language);
	console.log('Static system prompt:', staticSystemPrompt) // 添加日志
  
	// 获取动态性格提示词
	const characterPrompt = characterInfo.prompt.replace(/\{language\}/g, language);
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
				temperature: 1.3,
				top_p: 0.7,
				top_k: 50,
				frequency_penalty: 0.5,
				n: 1,
				messages: systempormpt.concat(historylist, userinput)
			})
		};

		console.log(stream)
		if (!stream) {
			const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', options)
				.then(response => response.json())
				.then(response => {
					// Assuming you want to extract the content of the response message
					return response.choices[0].message.content;
				})
				.catch(err => {
					console.error(err);
					return null;  // In case of an error, return null or handle appropriately
				});
			return res
		} else {
			// TODO: 还没完成流式生成的代码修改
			// 这里不是很好改，想用生成器去做，感觉如果写成异步生成器会很乱，暂时先写了一个生成器函数解决
			// 所以下面是的代码目前都没有用，之后可以的话，把它改成异步生成器，统一接口
			post('https://api.siliconflow.cn/v1/chat/completions', {
				...options,
				responseType: 'stream'
			})
				.then(response => {
					let firstReasoningContentOutput = true;
					let firstContentOutput = true;

					// 流式处理响应数据
					response.data.on('data', (chunk: string) => {
						const chunkStr = chunk.toString().trim();

						if (chunkStr.startsWith('data:')) {
							let dataStr = chunkStr.slice(6).trim(); // 去除"data:"前缀和之后的空格
							if (dataStr === "[DONE]") {
								console.log("\n\n============[DONE]============\n");
								return;
							}

							try {
								// 解析 JSON 数据
								const chunkJson = JSON.parse(dataStr);
								if (chunkJson.choices && Array.isArray(chunkJson.choices) && chunkJson.choices.length > 0) {
									const choice = chunkJson.choices[0];
									const delta = choice.delta || {};

									// 获取思考过程信息
									const reasoningContent = delta.reasoning_content;
									// 获取结果内容
									const content = delta.content;
									// 获取完成原因
									const finishReason = choice.finish_reason;

									if (finishReason) {
										console.log("\n\n\n==>查看结束原因，如果是stop，表示是正常结束的。finish_reason =", finishReason);
									}

									// 打印思考过程：reasoning_content（如果有）
									if (reasoningContent !== null) {
										if (firstReasoningContentOutput) {
											console.log("思考过程:");
											firstReasoningContentOutput = false;
										}
										process.stdout.write(reasoningContent);
									}

									// 打印结果内容：content（如果有）
									if (content !== null) {
										if (firstContentOutput) {
											console.log("\n\n==============================\n结果:");
											firstContentOutput = false;
										}
										process.stdout.write(content);
									}
								}
							} catch (error) {
								console.error(`JSON解码错误: ${error}`);
							}
						}
					});
				})
				.catch(error => {
					console.error(`请求失败，错误信息: ${error}`);
				});
		}
	}
}






interface Delta {
	reasoning_content: string | null;
	content: string | null;
}

interface Choice {
	delta?: Delta;
	finish_reason?: string;
}

interface ChunkJson {
	choices: Choice[];
}

// 修改fetchStreamData函数
export function* fetchStreamData(postparams: postParams & { signal?: AbortSignal ,forceLanguage?: string },language: string) {
	// 添加 abort 信号监听
	if (postparams.signal) {
		postparams.signal.addEventListener('abort', () => {
			console.log('Stream aborted by controller')
			reader?.cancel() // 主动取消流式读取
		})
	}

	let stream = postparams['stream']
	let historylist = getHistoryList(postparams['history'])

	// 获取性格类型
	const character = postparams['character'] as CharacterType || 'strict'
	console.log('Selected character:', character) // 添加日志

	const characterInfo = characterPrompts[character]
	console.log('Character info:', characterInfo) // 添加日志

	// 获取静态系统提示词
	const staticSystemPrompt = staticSystemPrompts[characterInfo.role].replace(/\{language\}/g, language);
	console.log('Static system prompt:', staticSystemPrompt) // 添加日志

  
	// 获取动态性格提示词
	const characterPrompt = characterInfo.prompt.replace(/\{language\}/g, language);
	console.log('Character prompt:', characterPrompt) // 添加日志

	// 修改系统提示词组合部分
	const forceLanguagePrompt = (() => {
	if (postparams.forceLanguage === 'en') {
		return `【强制语言要求】你必须全程使用英语回答！绝对禁止使用中文或其他语言！任何非英语回复都将被拒绝！`;
	} else if (postparams.forceLanguage === 'ja') {
		return `【強制言語要求】回答は必ず日本語で行ってください！中国語や他の言語の使用は厳禁です！日本語以外の回答は一切受け付けません！`;
	}
	return `在用户没有特殊要求时，可以使用中文进行教学`;
	})();

	// 组合系统提示词
	const systemPrompt = `【语言规则】${forceLanguagePrompt}\n\n【身份定义】${staticSystemPrompt}\n\n【性格定义】${characterPrompt}\n\n【再次强度必须遵守的语言规则】${forceLanguagePrompt}`;
	console.log('Final system prompt:', systemPrompt) // 添加日志

	let systempormpt = [{ content: systemPrompt, role: 'system' }]
	let userinput = [{ content: postparams['message'], role: 'user' }]



	// fetch 的返回类型为 Response
	const response: Response = yield fetch('https://api.siliconflow.cn/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: 'Bearer ' + import.meta.env.VITE_SILICONFLOW_API_KEY,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: import.meta.env.VITE_SILICONFLOW_MODEL,
			stream: stream,
			max_tokens: max_tokens_base[import.meta.env.VITE_SILICONFLOW_MODEL] || 4096,
			temperature: 1.3,
			top_p: 0.7,
			top_k: 50,
			frequency_penalty: 0.5,
			n: 1,
			messages: systempormpt.concat(historylist, userinput)
		})
	});

	const reader = response.body?.getReader();  // `body` 可能是 null
	if (!reader) {
		console.error('Failed to get reader from response body');
		return;
	}

	const decoder = new TextDecoder();
	let done: boolean = false, value: Uint8Array;

	while (!done) {
		// 暂停执行，等待外部继续
		({ done, value } = yield reader.read());
		const strs = decoder.decode(value, { stream: true }).trim();

		const chunkStrs = strs.split('data:');

		for (let chunkStr of chunkStrs) {
			if (chunkStr.trim()) {
				let dataStr = chunkStr.trim();
				if (dataStr === "[DONE]") {
					// console.log("\n\n============[DONE]============\n");
					return;
				}

				try {
					const chunkJson: ChunkJson = JSON.parse(dataStr);
					if (chunkJson.choices && Array.isArray(chunkJson.choices) && chunkJson.choices.length > 0) {
						const choice = chunkJson.choices[0];
						const delta: Delta = choice.delta ?? { reasoning_content: null, content: null };  // 使用空值合并操作符


						const reasoningContent: string | null = delta.reasoning_content;
						const content: string | null = delta.content;
						// const finishReason: string | undefined = choice.finish_reason;

						// if (finishReason) {
						// 	console.log("\n\n\n==>查看结束原因，如果是stop，表示是正常结束的。finish_reason =", finishReason);
						// }

						// 每次读取到数据后，yield 出 reasoningContent 或 content
						if (reasoningContent !== null) {
							yield reasoningContent;  // 返回同步数据
						}

						if (content !== null) {
							yield content;  // 返回同步数据
						}
					}
				} catch (error) {
					console.log(chunkStr)
					console.error(`JSON解码错误: ${error}`);
				}
			}
		}

	}
}



/*
	const gen = fetchStreamData(params);

	function step(value?: any) {
		const result = gen.next(value);

		if (!result.done) {
			// 检查 result.value 是否为 Promise，若是则等待其完成，否则直接打印
			if (result.value instanceof Promise) {
				result.value.then(data => step(data)).catch(err => gen.throw(err));
			} else {
				// 如果是同步数据，直接打印
				process.stdout.write(result.value);
				step(); // 继续执行生成器
			}
		}
	}

	step();


*/
