import { inject } from '@vercel/analytics'
import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

inject()

const target = document.getElementById('app')
if (!target) throw new Error('#app missing')
export default mount(App, { target })
