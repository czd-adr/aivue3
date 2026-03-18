import pinia from '@/store/index'
import { useUserStore } from '@/store/user'
import { useConfigStore } from '@/store/config'
import { formatArguments, currFullPath } from '@/utils'
import init from '@/utils/init'
import { KEY, aesEncrypt } from '@/utils/crypto'
import nav from './nav'

export const getSecret = () => {
  const currentTimeStamp = Math.floor(Date.now() / 1000)
  return aesEncrypt(currentTimeStamp, KEY)
}

const userStore = useUserStore(pinia)

// 定义请求配置接口，添加新的参数
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'post' | 'get'
  data?: any
  params?: any
  header?: any
  noSkipLogin?: boolean
  prefix?: string
  cancelPrevious?: boolean
  requestKey?: string
}

// 定义响应数据结构
interface ResponseData {
  code?: number
  message: string
  data: any
}

export const baseUrl = import.meta.env.VITE_API_URL || location.origin

// 存储活跃的请求，键为请求标识，值为请求任务
const activeRequests: Map<string, UniApp.RequestTask> = new Map()

export const handleLogin = () => {
  const configStore = useConfigStore()
  if (
    configStore.openWechatOauth === 1 &&
    configStore.openWechatRegister === 1 &&
    (configStore.XClientType === 'miniProgram' ||
      configStore.XClientType === 'wechat')
  ) {
    userStore.clear()
    userStore.setAuthType('wechatLogin')
  } else {
    userStore.clear()
    const fullPath = currFullPath()
    if (fullPath?.indexOf('login') > -1) return
    const url = `/pages/login/index${fullPath ? `?url=${fullPath}` : ''}`
    setTimeout(() => {
      nav.redirectTo(url)
    }, 200)
  }
}

let isIniting = false

export const setIsInit = (value: boolean) => {
  isIniting = value
}

export default function request<T extends ResponseData>(
  config: RequestConfig
): Promise<T['data']> {
  const configStore = useConfigStore()
  config.noSkipLogin = config.noSkipLogin || false
  const method = (config.method || 'GET').toUpperCase()
  const prefix = config.prefix || import.meta.env.VITE_API_PREFIX
  const url = `${baseUrl}${prefix}${config.url}`
  const header = {
    Authorization:
      'Bearer ' +
      (uni.getStorageSync('token') ? uni.getStorageSync('token') : null),
    'X-Admin-Type': 'shop',
    'X-Shop-Id': userStore.posInfo.shopId || '',
    'X-Client-Type': configStore.XClientType,
    'X-Locale-Code': '',
    Secret: getSecret(),
    ...config.header
  }
  const data = method === 'GET' ? formatArguments(config.params) : config.data

  if (config.cancelPrevious && config.requestKey) {
    const previousRequest = activeRequests.get(config.requestKey)
    if (previousRequest) {
      previousRequest.abort()
      activeRequests.delete(config.requestKey)
    }
  }

  return new Promise<T['data']>((resolve, reject) => {
    const requestTask = uni.request({
      url,
      method: method as 'GET' | 'POST',
      data,
      header,
      success: (response) => {
        if (config.requestKey) {
          activeRequests.delete(config.requestKey)
        }
        const data = response.data as T
        if (data.code !== 0) {
          if (data.code === 401 && !config.noSkipLogin) {
            handleLogin()
            uni.showToast({
              title: '请重新登录',
              icon: 'none'
            })
            console.log('请重新登录')
            if (!isIniting) {
              setIsInit(true)
              init()
            }

            reject({ message: '请登录' })
          }
          reject(data)
        } else {
          resolve(data.data)
        }
      },
      fail: (err) => {
        if (config.requestKey) {
          activeRequests.delete(config.requestKey)
        }
        if (err && err.errMsg && err.errMsg?.indexOf('abort') !== -1) {
          reject({ code: -1, message: '请求已取消', data: null })
        } else {
          reject(err)
        }
      }
    })

    if (config.requestKey) {
      activeRequests.set(config.requestKey, requestTask)
    }
  })
}

export function abortRequest(requestKey: string): boolean {
  const request = activeRequests.get(requestKey)
  if (request) {
    request.abort()
    activeRequests.delete(requestKey)
    return true
  }
  return false
}

export function abortAllRequests(): void {
  activeRequests.forEach((request) => request.abort())
  activeRequests.clear()
}
