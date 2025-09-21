<script setup lang="ts">
import { ref } from 'vue'
import { NModal, NRadioGroup, NRadio, NButton, NSpace, NIcon, NDivider } from 'naive-ui'
import { CharacterType } from '@/templates/characterPrompts'

const props = defineProps<{
	visible: boolean
}>()

const emit = defineEmits<{
	(e: 'update:visible', visible: boolean): void
	(e: 'select', character: CharacterType): void
}>()

const selectedCharacter = ref<CharacterType>('Japanese')

const characterOptions = [
	{ label: 'Japanese', value: 'Japanese' as CharacterType, icon: 'ri:user-follow-line', description: '严格要求、督促学习进度' },
	{ label: 'English', value: 'English' as CharacterType, icon: 'ri:emotion-happy-line', description: '积极鼓励、关注学习兴趣' }
]

function handleConfirm() {
	emit('select', selectedCharacter.value)
	emit('update:visible', false)
}

function handleCancel() {
	emit('update:visible', false)
}

function selectCharacter(value: CharacterType) {
	selectedCharacter.value = value
}
</script>

<template>
	<NModal v-model:show="props.visible" :mask-closable="false" transform-origin="center" class="character-selector-modal"
		:auto-focus="false" style="width: 600px" :close-on-esc="false">
		<div class="character-selector-container">
			<div class="character-selector-header">
				<h2 class="character-selector-title">请选择对话性格</h2>
				<NButton quaternary circle size="small" @click="handleCancel" class="close-button">
					<NIcon>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
							<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"
								stroke-linejoin="round"></path>
						</svg>
					</NIcon>
				</NButton>
			</div>

			<div class="character-selector-content">
				<p class="character-hint">在开始对话前，请选择一个AI助手的性格模式</p>
				<NDivider />

				<NRadioGroup v-model:value="selectedCharacter" name="characterGroup" class="character-group">
					<div v-for="option in characterOptions" :key="option.value" class="character-option">
						<NRadio :value="option.value" class="character-radio">
							<div class="character-card" :class="{ 'character-card-selected': selectedCharacter === option.value }"
								@click="selectCharacter(option.value)">
								<div class="character-icon" :class="{ 'character-icon-selected': selectedCharacter === option.value }">
									<NIcon>
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
											<path
												:d="option.value === 'Japanese' ? 'M10 15l-5-5 1.41-1.41L10 12.17l7.59-7.59L19 6l-9 9z' :
													option.value === 'English' ? 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' :
															'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z'"
												fill="currentColor"></path>
										</svg>
									</NIcon>
								</div>
								<div class="character-info">
									<div class="character-label">{{ option.label }}</div>
									<div class="character-description">{{ option.description }}</div>
								</div>
								<div class="character-check" v-if="selectedCharacter === option.value">
									<NIcon class="check-icon">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
											<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"></path>
										</svg>
									</NIcon>
								</div>
							</div>
						</NRadio>
					</div>
				</NRadioGroup>
			</div>

			<div class="character-selector-footer">
				<NSpace>
					<NButton @click="handleCancel" class="cancel-button">取消</NButton>
					<NButton type="primary" @click="handleConfirm" class="confirm-button">确认</NButton>
				</NSpace>
			</div>
		</div>
	</NModal>
</template>

<style scoped>
.character-selector-modal :deep(.n-modal) {
	border-radius: 12px;
	overflow: hidden;
	animation: modal-in 0.3s ease-out;
}

.character-selector-modal :deep(.n-modal-mask) {
	backdrop-filter: blur(2px);
	background-color: rgba(0, 0, 0, 0.5);
}

.character-selector-modal :deep(.n-modal-close) {
	display: none !important;
}

@keyframes modal-in {
	from {
		opacity: 0;
		transform: scale(0.95);
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}

.character-selector-modal :deep(.n-modal-body) {
	padding: 0;
}

.character-selector-container {
	background-color: #ffffff;
	border-radius: 12px;
	box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
	overflow: hidden;
}

.character-selector-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px 24px;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.character-selector-title {
	font-size: 18px;
	font-weight: 600;
	color: #333;
	margin: 0;
	position: relative;
}

.character-selector-title::after {
	content: "";
	position: absolute;
	bottom: -6px;
	left: 0;
	width: 40px;
	height: 3px;
	background-color: #18a058;
	border-radius: 3px;
}

.close-button {
	margin-left: auto;
	color: #999;
	transition: all 0.3s;
}

.close-button:hover {
	color: #333;
	background-color: rgba(0, 0, 0, 0.05);
	transform: rotate(90deg);
}

.character-selector-content {
	padding: 24px;
}

.character-hint {
	color: rgba(0, 0, 0, 0.45);
	margin-bottom: 16px;
	font-size: 14px;
}

.character-group {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 20px;
	margin-top: 20px;
}

.character-option {
	margin-bottom: 0;
}

.character-radio {
	width: 100%;
}

.character-radio :deep(.n-radio__dot) {
	display: none;
}

.character-card {
	display: flex;
	align-items: center;
	padding: 16px;
	border-radius: 10px;
	border: 2px solid transparent;
	background-color: #f9f9f9;
	transition: all 0.3s ease;
	position: relative;
	overflow: hidden;
	cursor: pointer;
}

.character-card::before {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: linear-gradient(135deg, transparent 0%, transparent 50%, rgba(24, 160, 88, 0.03) 50%, rgba(24, 160, 88, 0.03) 100%);
	opacity: 0;
	transition: opacity 0.3s ease;
}

.character-card:hover {
	background-color: #f5f5f5;
	transform: translateY(-2px);
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.character-card:hover::before {
	opacity: 1;
}

.character-card-selected {
	border-color: #18a058;
	background-color: rgba(24, 160, 88, 0.05);
	box-shadow: 0 4px 12px rgba(24, 160, 88, 0.1);
	animation: pulse-border 1.5s infinite;
}

@keyframes pulse-border {
	0% {
		box-shadow: 0 0 0 0 rgba(24, 160, 88, 0.4);
	}

	70% {
		box-shadow: 0 0 0 6px rgba(24, 160, 88, 0);
	}

	100% {
		box-shadow: 0 0 0 0 rgba(24, 160, 88, 0);
	}
}

.character-card-selected::after {
	content: "";
	position: absolute;
	top: 0;
	right: 0;
	width: 0;
	height: 0;
	border-style: solid;
	border-width: 0 20px 20px 0;
	border-color: transparent #18a058 transparent transparent;
}

.character-icon {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background-color: rgba(24, 160, 88, 0.1);
	margin-right: 16px;
	color: #18a058;
	font-size: 24px;
	transition: all 0.3s;
	position: relative;
	z-index: 1;
}

.character-icon-selected {
	background-color: #18a058;
	color: white;
	transform: scale(1.05);
	box-shadow: 0 2px 8px rgba(24, 160, 88, 0.3);
}

.character-info {
	flex: 1;
	position: relative;
	z-index: 1;
}

.character-label {
	font-weight: 600;
	font-size: 15px;
	margin-bottom: 6px;
	color: #333;
}

.character-description {
	font-size: 13px;
	color: rgba(0, 0, 0, 0.6);
	line-height: 1.4;
}

.character-check {
	position: absolute;
	right: 12px;
	top: 12px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	animation: check-in 0.3s ease;
	z-index: 2;
}

@keyframes check-in {
	from {
		opacity: 0;
		transform: scale(0);
	}

	50% {
		transform: scale(1.2);
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}

.check-icon {
	color: #18a058;
	font-size: 20px;
}

.character-selector-footer {
	display: flex;
	justify-content: flex-end;
	padding: 16px 24px;
	border-top: 1px solid rgba(0, 0, 0, 0.06);
	background-color: #fafafa;
}

.cancel-button {
	min-width: 80px;
	transition: all 0.3s;
}

.cancel-button:hover {
	background-color: #f5f5f5;
	transform: translateY(-1px);
}

.confirm-button {
	min-width: 80px;
	transition: all 0.3s;
}

.confirm-button:hover {
	transform: translateY(-1px);
	box-shadow: 0 2px 8px rgba(24, 160, 88, 0.2);
}
</style>
