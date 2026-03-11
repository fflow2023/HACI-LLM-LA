// views\src\api\chat.ts
import qs from "qs";
import { api, remoteapi } from "./api";

// export const chat = (params: any) => {//不用
//   return api({
//     url: '/chat',
//     method: 'post',
//     data: qs.stringify(params),
//   })
// }

// export const chatOpenAI = (params: any) => {//不用
//   return api({
//     url: '/chatOpenAI',
//     method: 'post',
//     data: qs.stringify(params),
//   })
// }

// export const chatfileOpenai = (params: any) => {//不用
//   return api({
//     url: '/chatfileOpenai',
//     method: 'post',
//     data: qs.stringify(params),
//   })
// }

// 知识库文档chat相关
export const chatfile = (params: any) => {
	//获取某个文件的内容
	return api({
		url: "/chatfile",
		method: "post",
		data: qs.stringify(params),
	});
};

export const chatfileContent = (params: any) => {
	//获取知识库内容
	return api({
		url: "/chatfileContent",
		method: "post",
		data: qs.stringify(params),
	});
};

// 知识库管理相关
export const getfilelist = (knowledgeBase: string) => {
	//获取知识库文件列表
	return api({
		url: "/file/query-list",
		method: "get",
		params: { knowledgeBase },
	});
};

export const deletefile = (params: any) => {
	//删除知识库文件
	return api({
		url: "/file/delete",
		method: "post",
		data: qs.stringify(params),
	});
};

export const setembedding = (params: any) => {
	// ?
	return api({
		url: "/set-embedding",
		method: "post",
		data: qs.stringify(params),
	});
};

interface postParams {
	message: string;
	history: string[][];
	stream: boolean;
}

export const chatSiliconflow = (params: postParams, language: string) => {
	return remoteapi(
		{
			base: "siliconflow",
			kind: "chat",
			methods: "post",
			postparams: params,
		},
		language,
	);
};
