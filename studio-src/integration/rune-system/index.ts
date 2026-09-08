const host = document.getElementById('studio-root')!
const nav = document.querySelector<HTMLElement>('.nav')!
let requested = false
async function mount() {
  if (requested) return
  requested = true
  try {
    const { mountStudio } = await import('./studio')
    mountStudio(host)
  } catch {
    requested = false
    const status = host.querySelector('[role="status"]')
    if (status) status.textContent = 'The studio couldn’t load. You can continue to the text below.'
  }
}
const observer = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.intersectionRatio >= .02) && host.dataset.skipped !== 'true') void mount()
}, { threshold: .02 })
observer.observe(host)

document.addEventListener('click', event => {
  if (!(event instanceof MouseEvent) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-studio-exit]') : null
  if (!link) return
  if (!document.getElementById(link.hash.slice(1))) return
  event.preventDefault()
  host.dataset.skipped = 'true'
  host.dispatchEvent(new Event('studio:skip'))
  const target = document.getElementById(link.hash.slice(1))!
  target.focus({ preventScroll: true })
  target.scrollIntoView({ behavior: 'instant', block: 'start' })
  history.replaceState(null, '', link.hash)
})
host.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('[data-studio-restart]')) {
    host.dataset.skipped = 'false'
    host.scrollIntoView({ behavior: 'instant' })
    history.replaceState(null, '', '#approach')
    void mount()
  }
})
let lastScroll = scrollY, upwardScroll = 0
const updateNav = () => {
  const released = document.getElementById('work')!.getBoundingClientRect().top <= 12
  const inStudio = !released && document.getElementById('approach')!.getBoundingClientRect().top <= 12
  const reveal = host.dataset.skipped === 'true' ? 1 : Number(host.dataset.copyReveal || 0)
  nav.style.opacity = String(inStudio ? 1 - reveal : 1)
  const navReady = host.dataset.navReady === 'true'
  const navPush = Number(host.dataset.navPush || 0)
  nav.style.setProperty('--nav-push', String(navPush))
  nav.classList.toggle('is-pushed', inStudio && navPush > 0)
  nav.inert = inStudio && (!navReady || reveal === 1)
  const delta = scrollY - lastScroll
  upwardScroll = delta < 0 ? upwardScroll - delta : 0
  if (inStudio && !navReady) nav.classList.add('is-hidden')
  else if (inStudio || scrollY <= 0 || upwardScroll >= 120) nav.classList.remove('is-hidden')
  else if (delta > 0) nav.classList.add('is-hidden')
  nav.classList.toggle('is-paper', released)
  nav.classList.toggle('is-studio', inStudio)
  document.documentElement.dataset.navTheme = 'light'
  lastScroll = scrollY
}
window.addEventListener('scroll', updateNav, { passive: true })
window.addEventListener('resize', updateNav)
host.addEventListener('studio:presentation', updateNav)
updateNav()
document.querySelectorAll('.iv, .split').forEach(el => el.classList.add('is-in'))
document.body.classList.add('ready')
// Direct links to content must also bypass the long region on first load.
if (['#work', '#contact', '#approach-copy'].includes(location.hash)) {
  host.dataset.skipped = 'true'
  requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'instant' }))
}

// Restore the source contact reveal, whose text/CTA are hidden in canonical CSS until this runs.
const contactWrap = document.querySelector<HTMLElement>('.contact-reveal')!
const contact = contactWrap.querySelector<HTMLElement>('.contact')!
const fog = contact.querySelector<HTMLElement>('.contact-bg')!
const lede = contact.querySelector<HTMLElement>('.contact__lede')!
const cta = contact.querySelector<HTMLElement>('.contact__cta')!
let contactFrame = 0
const updateContact = () => {
  contactFrame = 0
  const staticLayout = getComputedStyle(contact).position !== 'sticky' || matchMedia('(prefers-reduced-motion: reduce)').matches
  const p = staticLayout ? 1 : Math.max(0, Math.min(1, -contactWrap.getBoundingClientRect().top / (contactWrap.offsetHeight / 3)))
  fog.style.transform = `translate3d(0,${p * 100}%,0) scale(${1 - p * .5})`
  const q = staticLayout ? 1 : Math.max(0, Math.min(1, (p - .86) / .14))
  for (const el of [lede, cta]) { el.style.opacity = String(q); el.style.transform = `translateY(${(1-q)*8}px)` }
}
const scheduleContact = () => { if (!contactFrame) contactFrame = requestAnimationFrame(updateContact) }
window.addEventListener('scroll', scheduleContact, { passive: true })
window.addEventListener('resize', scheduleContact)
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', scheduleContact)
updateContact()
