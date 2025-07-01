<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, ref, watch, onBeforeMount } from 'vue'
import { NButton, NLayoutSider, NRadioButton, NRadioGroup, NUpload } from 'naive-ui'
import List from './List.vue'
import step from './step.vue'
import filelist from './filelist.vue'
import Footer from './Footer.vue'
import { useAppStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { PromptStore } from '@/components/common'
import { useRouter, useRoute } from 'vue-router'
import { useCharacter } from '@/hooks/useCharacter'
import { CharacterType } from '@/templates/characterPrompts'
import CharacterSelector from '../../components/CharacterSelector.vue'

const appStore = useAppStore()
const chatStore = useChatStore()
const router = useRouter()
const route = useRoute()
const { currentCharacter, setCurrentCharacter } = useCharacter()

const { isMobile } = useBasicLayout()

const show = ref(false)
const showCharacterSelector = ref(false)

const menu = ref(1)
const songs: { value: number; label: string }[] = [
	// {
	//   value: 1,
	//   label: '会话',
	// },
	// {
	//   value: 2,
	//   label: '模型',
	// },
	// {
	//   value: 3,
	//   label: '知识库',
	// },
	// {
	//   value: 4,
	//   label: '提示词',
	// },
]
const collapsed = computed(() => appStore.siderCollapsed)

// 修改新建聊天函数：先弹出性格选择器，不预先创建聊天
function handleAdd() {
	menu.value = 1

	// 显示性格选择器，但不先创建聊天
	showCharacterSelector.value = true

	if (isMobile.value)
		appStore.setSiderCollapsed(true)
}

// 修改性格选择处理函数：用户确认后才创建聊天
function handleCharacterSelect(character: CharacterType) {
	// 设置当前性格 - 使用全局性格钩子
	setCurrentCharacter(character)

	// 创建新聊天
	const uuid = Date.now()
	chatStore.addHistory({
		title: 'New Chat',
		uuid,
		isEdit: false,
		character: character,
		characterDescription: getCharacterDescription(character),
	})

	// 导航到新创建的聊天
	router.push({ name: 'Chat', params: { uuid } })

	// 隐藏选择器
	showCharacterSelector.value = false
}

// 处理取消选择
function handleCancel() {
	// 仅关闭选择器，不创建聊天
	showCharacterSelector.value = false
}

// 获取性格描述的辅助函数
function getCharacterDescription(character: CharacterType): string {
	// const characterMap = {
	// 	strict: '严厉型（教师角色）',
	// 	encouraging: '鼓励型（教师角色）',
	// 	topStudent: '学霸领学型（同学角色）',
	// 	strugglingStudent: '学渣共同进步型（同学角色）'
	// }
	const characterMap = {
		Japanese: '日语学习助手',
		English: '英语学习助手'
	}
	return characterMap[character] || '未知性格类型'
}

function handleUpdateCollapsed() {
	appStore.setSiderCollapsed(!collapsed.value)
}

const getMobileClass = computed<CSSProperties>(() => {
	if (isMobile.value) {
		return {
			position: 'fixed',
			zIndex: 50,
		}
	}
	return {}
})

const mobileSafeArea = computed(() => {
	if (isMobile.value) {
		return {
			paddingBottom: 'env(safe-area-inset-bottom)',
		}
	}
	return {}
})

// 监听路由变化，同步性格状态
watch(
	() => route.params.uuid,
	(newUuid) => {
		if (newUuid) {
			const uuid = Number(newUuid)
			const history = chatStore.history.find(h => h.uuid === uuid)
			if (history && history.character) {
				// 同步性格状态
				setCurrentCharacter(history.character as CharacterType)
			}
		}
	},
	{ immediate: true }
)

// 监听移动设备状态
watch(
	isMobile,
	(val) => {
		appStore.setSiderCollapsed(val)
	},
	{
		immediate: true,
		flush: 'post',
	},
)

const api_file_url = import.meta.env.VITE_VIEWS_ADDRESS + '/api/file'
</script>

<template>
	<NLayoutSider :collapsed="collapsed" :collapsed-width="0" :width="260"
		:show-trigger="isMobile ? false : 'arrow-circle'" collapse-mode="transform" position="absolute" bordered
		:style="getMobileClass" @update-collapsed="handleUpdateCollapsed">
		<Footer />
		<div class="flex flex-col h-full " :style="mobileSafeArea">
			<main class="flex flex-col flex-1 min-h-0">
				<div class="  flex justify-between">
					<NRadioGroup v-model:value="menu" name="radiobuttongroup1">
						<NRadioButton v-for="song in songs" :key="song.value" :value="song.value" :label="song.label" />
					</NRadioGroup>
				</div>

				<!-- 知识库界面 -->
				<div v-if="menu === 3">
					<div class="p-4">
						<NUpload :action="api_file_url" :headers="{
							'naive-info': 'hello!',
						}" :data="{
							'naive-data': 'cool! naive!',
						}">
							<NButton block>
								文件上传
							</NButton>
						</NUpload>
					</div>
					<div class="p-2 flex-1 min-h-0 pb-4 overflow-hidden">
						<filelist />
					</div>
				</div>
				<!-- 会话界面 -->
				<div v-if="menu === 1">
					<div class="p-4">
						<NButton block @click="handleAdd">
							新建聊天
						</NButton>
					</div>
					<div class="p-2 flex-1 min-h-0 pb-4 overflow-hidden">
						<List />
					</div>
				</div>
				<!-- 模型界面 -->
				<div v-if="menu === 2">
					<div class="p-4">
						<NButton block>
							选择模型
						</NButton>
					</div>
					<div class="p-2 flex-1 min-h-0 pb-4 overflow-hidden">
						<step />
					</div>
				</div>
				<!-- 提示词界面 -->
				<div v-if="menu === 4">
					<div class="p-4">
						<NButton block @click="show = true">
							{{ $t('store.siderButton') }}
						</NButton>
					</div>
				</div>
			</main>
		</div>
	</NLayoutSider>
	<template v-if="isMobile">
		<div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
	</template>
	<PromptStore v-model:visible="show" />

	<!-- 修改性格选择对话框，增加取消事件处理 -->
	<CharacterSelector v-model:visible="showCharacterSelector" @select="handleCharacterSelect"
		@update:visible="(visible) => !visible && handleCancel()" />
</template>
