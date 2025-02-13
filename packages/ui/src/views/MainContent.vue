<template>
  <MainLayout v-if="player.username">
    <div class="main-content">
      <div class="header">
        <div>
          <p class="subtitle">PLAYER ID: {{ player.username }}</p>
          <p class="subtitle">RANCH NAME: {{ player.ranch.name }}</p>
          <p class="subtitle">RANCH RESOURCE: {{ player.ranch.resource }}</p>
        </div>
        <img src="@/assets/ranchLogo.svg" alt="Witty Bufficorns ranch logo" />
      </div>
      <WittyCreature
        v-if="player.creaturePreview"
        :creature-preview="player.creaturePreview"
      />
      <div
        class="mint-status"
        v-if="player.mintInfo && player.mintInfo.transactionHash"
      >
        <p class="label">TRANSACTION HASH</p>
        <div class="address">
          <a
            :href="`${etherscanBaseUrl}/${player.mintInfo.transactionHash}`"
            target="_blank"
            >{{ player.mintInfo.transactionHash }}
          </a>
          <img class="external-link-icon" src="@/assets/external.svg" alt="" />
        </div>
      </div>
      <div
        class="mint-status"
        v-if="
          player.creatureData &&
            player.creatureData.tokenId &&
            parseInt(player.creatureData.tokenId) !== 0
        "
      >
        <div class="opensea">
          <a
            :href="`${openseaBaseUrl}/${player.creatureData.tokenId}`"
            target="_blank"
            >See on OpenSea
          </a>
          <img
            class="external-link-icon"
            src="@/assets/external-black.svg"
            alt=""
          />
        </div>
      </div>
      <BufficornsList />
      <div class="buttons">
        <Button
          v-if="player.gameOver && !player.creaturePreview"
          @click="openModal('preview')"
          type="primary"
          class="center-item"
        >
          PREVIEW NFT
        </Button>
        <Button
          v-else-if="player.gameOver && player.creaturePreview"
          @click="mint"
          :type="type"
          class="center-item"
        >
          MINT NFT
        </Button>
        <router-link
          v-if="!player.gameOver"
          :to="type === 'disable' ? '' : '/scan'"
          class="center-item"
        >
          <Button type="dark">
            TRADE
          </Button>
        </router-link>
        <Button @click="openModal('export')" type="dark">
          BACKUP
        </Button>
        <Button type="dark">
          STATS
        </Button>
      </div>
    </div>
  </MainLayout>

  <ModalDialog :show="modal.visible.value" v-on:close="closeModal">
    <ModalExport v-if="modals.export" />
    <GameOverModal v-if="modals.gameOver" />
    <ModalMint v-if="modals.mint" />
    <ModalPreview v-if="modals.preview" />
  </ModalDialog>
</template>

<script>
import { useStore } from '@/stores/player'
import { computed, onBeforeMount, onBeforeUnmount, reactive, ref } from 'vue'
import imageUrl from '@/assets/egg-example.png'
import { useModal } from '@/composables/useModal'
import { useWeb3Witmon } from '../composables/useWeb3Witmon'
import { ETHERSCAN_BASE_URL, OPENSEA_BASE_URL } from '../constants'

export default {
  setup () {
    const modal = useModal()
    const player = useStore()
    const web3Witmon = useWeb3Witmon()
    const modals = reactive({
      mint: false,
      export: false,
      preview: false,
      gameOver: false
    })
    const gameOver = player.gameOver
    let timeout

    onBeforeMount(async () => {
      await player.getInfo()
      await player.getMintInfo()
      await player.getPreview()
      if (player.gameOver) {
        const data = await web3Witmon.getCreatureData()
        player.setCreatureData(data)
      }

      if (!player.gameOver) {
        timeout = setTimeout(() => {
          player.timeToBirth -= 1
        }, player.timeToBirth - Date.now())
      }
    })

    onBeforeUnmount(() => {
      clearTimeout(timeout)
    })

    const type = computed(() =>
      player.incubating ||
      (player.creatureData && parseInt(player.creatureData.tokenId) !== 0)
        ? 'disable'
        : 'primary'
    )
    const mintStatus = computed(() =>
      player.mintInfo.blockHash ? 'minted' : 'pending'
    )

    function openModal (name) {
      const needProvider = name === 'mint' || name === 'preview'
      if (!web3Witmon.isProviderConnected.value && needProvider) {
        modals['gameOver'] = true
      } else {
        modals[name] = true
      }
      modal.showModal()
    }

    function closeModal () {
      modals.mint = false
      modals.export = false
      modals.preview = false
      modals.gameOver = false
      modal.hideModal()
    }

    function mint () {
      if (type.value !== 'disable') {
        openModal('mint')
      }
    }

    return {
      etherscanBaseUrl: ETHERSCAN_BASE_URL,
      openseaBaseUrl: OPENSEA_BASE_URL,
      mint,
      gameOver,
      player,
      type,
      closeModal,
      openModal,
      imageUrl,
      modal,
      modals,
      mintStatus,
      enableProvider: web3Witmon.enableProvider,
      preview: web3Witmon.preview,
      isProviderConnected: web3Witmon.isProviderConnected,
      getCreatureData: web3Witmon.getCreatureData
    }
  }
}
</script>

<style lang="scss" scoped>
.main-content {
  display: grid;
  row-gap: 32px;
}
.header {
  display: grid;
  grid-template-columns: auto 1fr;
  justify-items: flex-end;
  align-items: center;
}
.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: max-content;
  justify-self: center;
  grid-template-rows: auto auto;
  grid-gap: 16px;
  .center-item {
    grid-column: 1 / span 2;
    align-self: center;
    width: max-content;
    justify-self: center;
  }
}
</style>
