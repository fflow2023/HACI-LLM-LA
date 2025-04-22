import request from './axios'
import { getHistoryList } from './tools'
import axios from 'axios';

const { post } = axios;


export const api = async (data: object): Promise<any> => {
	return await request({
	  ...data,
	})
}

interface postParams {
	message: string,
	history: string[][],
	stream: boolean,
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

// 仿照之前的接口，写成异步的函数，支持silicon flow的接口
export const remoteapi = async (params: remoteapiParams): Promise<any> => {
	let kind = params['kind']
	let base = params['base']
	let methods = params['methods']
	let postparams = params['postparams']
	let stream = postparams['stream']
	let historylist = getHistoryList(params['postparams']['history'])
	let systempormpt = [{ content: `
		您好，我需要您帮我撰写一份起诉书。在开始写作之前，请确保已经收集到所有必要的信息。如果有信息不完整，您可以多次询问，直到所有信息都确认无误。
		以下是起诉书的基本结构，您需要确保格式规范：
		标题：应明确标明“起诉书”。
		案件编号：如果已有案件编号，提供案件编号；如果没有，请跳过此项。
		原告信息：包括姓名（或公司名称）、性别（或法人代表）、年龄（或公司成立时间）、住址（或公司地址）、联系方式等。
		被告信息：包括姓名（或公司名称）、性别（或法人代表）、年龄（或公司成立时间）、住址（或公司地址）、联系方式等。
		案件事实：详细叙述案件发生的经过，包括所有相关的时间、地点、人物及事件背景。
		诉讼请求：明确您希望法院作出的判决或裁定，包括赔偿金额、行为的停止或其他要求。
		证据清单：列出所有您打算提交的证据，包括但不限于书面证据、照片、视频、音频记录等。
		法律依据：请引用相关法律条文或条例，说明您的诉讼请求符合哪些法律规定。如果可以，请明确指出根据什么文件什么条目，这样的引用字眼（适用法条等具体信息的索引）
		原告签字：原告（或代表律师）签字并注明日期。
		请在每个部分逐一询问相关信息，确保内容完整并符合规范后再开始起草起诉书。
		`, role: 'system'
	}]
	let userinput = [{ content: postparams['message'], role: 'user' }]

	// 目前暂时只实现一种情况
	if(base == 'siliconflow' && kind == 'chat' && methods == 'post') {
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

// 通过生成器来处理流式数据
export function* fetchStreamData(postparams: postParams) {
	let stream = postparams['stream']
	let historylist = getHistoryList(postparams['history'])
	let systempormpt = [{ content: `
		您好，我需要您帮我撰写一份起诉书。在开始写作之前，请确保已经收集到所有必要的信息。如果有信息不完整，您可以多次询问，直到所有信息都确认无误。
		以下是起诉书的基本结构，您需要确保格式规范：
		标题：应明确标明“起诉书”。
		案件编号：如果已有案件编号，提供案件编号；如果没有，请跳过此项。
		原告信息：包括姓名（或公司名称）、性别（或法人代表）、年龄（或公司成立时间）、住址（或公司地址）、联系方式等。
		被告信息：包括姓名（或公司名称）、性别（或法人代表）、年龄（或公司成立时间）、住址（或公司地址）、联系方式等。
		案件事实：详细叙述案件发生的经过，包括所有相关的时间、地点、人物及事件背景。
		诉讼请求：明确您希望法院作出的判决或裁定，包括赔偿金额、行为的停止或其他要求。
		证据清单：列出所有您打算提交的证据，包括但不限于书面证据、照片、视频、音频记录等。
		法律依据：请引用相关法律条文或条例，说明您的诉讼请求符合哪些法律规定。如果可以，请明确指出根据什么文件什么条目，这样的引用字眼（适用法条等具体信息的索引）
		原告签字：原告（或代表律师）签字并注明日期。
		请在每个部分逐一询问相关信息，确保内容完整并符合规范后再开始起草起诉书。
		`, role: 'system' }]
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
			temperature: 0.7,
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
