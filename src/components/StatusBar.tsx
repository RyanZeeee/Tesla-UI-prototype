import lockIcon from '../assets/icons/lock.svg'
import bluetoothIcon from '../assets/icons/bluetooth.svg'
import cellSignalIcon from '../assets/icons/cell signal.svg'

interface StatusBarProps {
  expanded?: boolean
  temperature?: number
  time?: string
}

export function StatusBar({ expanded = false, temperature = 17, time = '10:21 PM' }: StatusBarProps) {
  return (
    <div
      className="relative"
      style={{ width: 1340, height: 70 }}
    >
      {/* 黑色透明度渐变背景 */}
      <div
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))',
          opacity: expanded ? 0 : 1,
        }}
      />

      {/* 左侧：lock、bluetooth、cell signal */}
      <div
        className="absolute flex gap-[12px] transition-all duration-500 ease-out"
        style={{
          top: 10,
          left: expanded ? 800 : 20,
        }}
      >
        <img src={lockIcon} alt="lock" width={48} height={48} />
        <img src={bluetoothIcon} alt="bluetooth" width={48} height={48} />
        <img src={cellSignalIcon} alt="cell signal" width={48} height={48} />
      </div>

      {/* 右侧：temp、clock */}
      <div
        className="absolute flex gap-[50px] dashboard-ui"
        style={{ top: 22, right: 50, height: 25, alignItems: 'center', whiteSpace: 'nowrap' }}
      >
        <span aria-label={`Outside temperature ${temperature} degrees Celsius`}>{temperature} °C</span>
        <span aria-label={`Time ${time}`}>{time}</span>
      </div>
    </div>
  )
}
