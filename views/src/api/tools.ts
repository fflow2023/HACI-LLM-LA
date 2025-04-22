
interface historyListItem {
	content: string,
	role: string,
}


export const getHistoryList: (data: string[][]) => { content: string; role: string; }[] = 
(data: string[][]) => {
	let historylist: historyListItem[] = [];
	
	data.forEach((conversation, index) => {
		conversation.forEach(word => {
			console.log
			if (word.startsWith("Human:")) {
				historylist.push({
					content: word.replace("Human:", ""),
					role: "user"
				})
			} else if (word.startsWith("Assistant:")) {
				historylist.push({
					content: word.replace("Assistant:", ""),
					role: "assistant"
				})
			}
		})
	})
	return historylist
}


