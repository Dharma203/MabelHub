'use client'

import { AnimatePresence } from 'motion/react'
import * as motion from 'motion/react-client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SharedLayoutAnimation() {
  const [selectedTab, setSelectedTab] = useState(tabs[0])
  const router = useRouter()

  return (
    <div style={container}>
      <nav style={nav}>
        <ul style={tabsContainer}>
          {tabs.map((item) => (
            <motion.li
              key={item.label}
              initial={false}
              animate={{
                backgroundColor: item === selectedTab ? '#eee' : '#eee0',
              }}
              style={tab}
              onClick={() => {
                setSelectedTab(item)
              }}
            >
              {`${item.icon} ${item.label}`}
              {item === selectedTab ? (
                <motion.div
                  style={underline}
                  layoutId='underline'
                  id='underline'
                />
              ) : null}
            </motion.li>
          ))}
        </ul>
      </nav>
      <main style={iconContainer}>
        <AnimatePresence mode='wait'>
          <motion.div
            key={selectedTab ? selectedTab.label : 'empty'}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={icon}
            onClick={() => selectedTab && router.push(selectedTab.link)}
          >
            {selectedTab ? selectedTab.icon : '😋'}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

/**
 * ==============   Styles   ================
 */

const container: React.CSSProperties = {
  width: 480,
  height: 360,
  maxWidth: 'calc(100% - 10px)',
  maxHeight: 'calc(100% - 40px)',
  borderRadius: 10,
  background: 'white',
  overflow: 'hidden',
  boxShadow:
    '0 1px 1px hsl(0deg 0% 0% / 0.075), 0 2px 2px hsl(0deg 0% 0% / 0.075), 0 4px 4px hsl(0deg 0% 0% / 0.075), 0 8px 8px hsl(0deg 0% 0% / 0.075), 0 16px 16px hsl(0deg 0% 0% / 0.075), 0 2px 2px hsl(0deg 0% 0% / 0.075), 0 4px 4px hsl(0deg 0% 0% / 0.075), 0 8px 8px hsl(0deg 0% 0% / 0.075), 0 16px 16px hsl(0deg 0% 0% / 0.075)',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
}

const nav: React.CSSProperties = {
  background: '#fdfdfd',
  padding: '5px 5px 0',
  borderRadius: '10px',
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  borderBottom: '1px solid #eeeeee',
  height: 44,
}

const tabsStyles: React.CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  fontWeight: 500,
  fontSize: 14,
}

const tabsContainer: React.CSSProperties = {
  ...tabsStyles,
  display: 'flex',
  width: '100%',
}

const tab: React.CSSProperties = {
  ...tabsStyles,
  borderRadius: 5,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  width: '100%',
  padding: '10px 15px',
  position: 'relative',
  background: 'white',
  cursor: 'pointer',
  height: 24,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
  userSelect: 'none',
  color: 'var(--black)',
}

const underline: React.CSSProperties = {
  position: 'absolute',
  bottom: -2,
  left: 0,
  right: 0,
  height: 2,
  background: 'var(--accent)',
}

const iconContainer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1,
}

const icon: React.CSSProperties = {
  fontSize: 128,
  cursor: 'pointer',
}

/**
 * ==============   Data   ================
 */

const segmentasiOptions = [
  { icon: '🏛️', label: 'B2G', link: '/database-prospek/form-b2g' },
  { icon: '🏢', label: 'B2B', link: '/database-prospek/form-b2b' },
]

const [B2G, B2B] = segmentasiOptions
const tabs = [B2G, B2B]
