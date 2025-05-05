declare namespace Chat {

	// 新增元数据类型
	interface ExportMeta {
		exportDate: string
		userInfo: {
			username: string
			name: string
			role: string
		}
	}


	interface Chat {
		response?: string // ✅ 添加可选属性
		dateTime: string
		text: string
		inversion?: boolean
		error?: boolean
		loading?: boolean
		conversationOptions?: ConversationRequest | null
		requestOptions: {
			prompt: string;
			options?: ConversationRequest | null;
			character?: string;
			// 新增用户信息关联
			userInfoRef?: string; // 关联meta中的用户信息
		}
		// 新增附件类型
		attachments?: Array<{
			name: string
			content: string
		}>
	}


	interface History {
		title: string
		isEdit: boolean
		uuid: number
		character: string
		characterDescription: string
		// 新增创建者信息
		creator?: {
			username: string
			name: string
		  }
	}

	interface ChatState {
		active: number | null
		usingContext: boolean;
		history: History[]
		chat: {
			uuid: number;
			data: Chat[];
			character: string;
			characterDescription: string;
		}[]
		// 新增元数据存储
		meta?: ExportMeta
	}

	interface ConversationRequest {
		conversationId?: string
		parentMessageId?: string
	}

	interface ConversationResponse {
		conversationId: string
		detail: {
			choices: { finish_reason: string; index: number; logprobs: any; text: string }[]
			created: number
			id: string
			model: string
			object: string
			usage: { completion_tokens: number; prompt_tokens: number; total_tokens: number }
		}
		id: string
		parentMessageId: string
		role: string
		text: string
	}
}
