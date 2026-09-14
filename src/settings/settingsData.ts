export const pageNames = ["Controls", "Autopilot", "Lights", "Locks", "Display", "Dynamics", "Safety", "Service"] as const
export type SettingsPage = typeof pageNames[number]
export type SettingValue = string | number | boolean
export type Preferences = Record<string, SettingValue>
export interface SettingField {
  id: string
  label: string
  kind: 'toggle' | 'select' | 'range' | 'action'
  initial?: SettingValue
  description?: string
  options?: string[]
  min?: number
  max?: number
  step?: number
  unit?: string
  requires?: string
}
export interface SettingSection { title: string; fields: SettingField[] }
const toggle = (id: string, label: string, initial: boolean, description?: string, requires?: string): SettingField => ({ id, label, initial, description, requires, kind: 'toggle' })
const select = (id: string, label: string, options: string[], initial: string, description?: string): SettingField => ({ id, label, options, initial, description, kind: 'select' })
const range = (id: string, label: string, initial: number, min: number, max: number, unit: string, description?: string, requires?: string): SettingField => ({ id, label, initial, min, max, unit, description, requires, kind: 'range' })
const action = (id: string, label: string, description?: string): SettingField => ({ id, label, description, kind: 'action' })
const exteriorLights = select('headlights', "Exterior lights", ["Off", "Parking", "On", "Auto"], "Auto")
const brightness = range('brightness', "Screen brightness", 80, 20, 100, '%')

export const settingsSections: Record<SettingsPage, SettingSection[]> = {
  "Controls": [
    { title: "Quick controls", fields: [brightness, exteriorLights] },
    { title: "Visibility & adjustment", fields: [
      action('mirrors', "Mirrors", "Adjust the left and right mirrors"), action('steering', "Steering wheel", "Adjust height and reach"),
      toggle('foldMirrors', "Fold mirrors", false), select('wipers', "Wipers", ["Off", 'I', 'II', 'III', 'IIII', "Auto"], "Auto"),
    ] },
    { title: "Convenience", fields: [action('glovebox', "Glovebox"), toggle('windowLock', "Window lock", false, "Disable rear window switches")] },
  ],
  "Autopilot": [
    { title: "Driver assistance", fields: [
      select('autopilot', "Autopilot features", ["Traffic-Aware Cruise Control", "Autosteer"], "Traffic-Aware Cruise Control", "Stay attentive to the road and be ready to take over at all times."),
      range('followDistance', "Following distance", 4, 2, 7, "levels"),
      select('setSpeed', "Set speed", ["Current speed", "Speed limit"], "Speed limit"),
      range('speedOffset', "Speed offset", 0, -10, 10, 'km/h'),
      toggle('greenChime', "Green light chime", true),
    ] },
    { title: "Lanes & blind spots", fields: [
      select('laneDeparture', "Lane Departure Avoidance", ["Off", "Warning", "Assist"], "Assist"),
      toggle('emergencyLane', "Emergency Lane Departure Avoidance", true),
      toggle('blindCamera', "Blind spot camera", true, "Show the corresponding camera view when signaling."),
      toggle('blindChime', "Blind spot collision warning chime", true),
    ] },
    { title: "Collision avoidance", fields: [
      select('collisionWarning', "Forward Collision Warning", ["Off", "Late", "Medium", "Early"], "Medium"),
      toggle('emergencyBraking', "Automatic Emergency Braking", true), toggle('obstacleAcceleration', "Obstacle-Aware Acceleration", true),
    ] },
  ],
  "Lights": [
    { title: "Exterior lighting", fields: [exteriorLights,
      toggle('frontFog', "Front fog lights", false, "Available with low beams."), toggle('rearFog', "Rear fog lights", false),
      toggle('adaptiveLights', "Adaptive headlights", true, "Adjust high beams around other vehicles."),
      toggle('headlightExit', "Headlights after exit", true, "Keep the headlights on briefly after parking and exiting."), action('headlightAim', "Headlight adjustment"),
    ] },
    { title: "Interior lighting", fields: [
      select('domeLights', "Dome lights", ["Off", "On", "Auto"], "Auto"),
      toggle('ambientLights', "Ambient lights", true), toggle('steeringLights', "Steering wheel lights", true),
    ] },
  ],
  "Locks": [
    { title: "Doors", fields: [
      toggle('doorsLocked', "Lock doors", false),
      toggle('walkAway', "Walk-Away Door Lock", true), toggle('excludeHomeLock', "Exclude Home", false, "Do not lock automatically at the saved Home location.", 'walkAway'),
      toggle('lockChime', "Lock confirmation sound", true), toggle('driverUnlock', "Driver Door Unlock Mode", false),
      toggle('parkUnlock', "Unlock on Park", true), toggle('closeWindows', "Close windows on lock", true),
    ] },
    { title: "Passengers & reminders", fields: [
      select('childLock', "Child locks", ["Off", "Left", "Right", "Both"], "Off"), toggle('windowLock', "Window lock", false),
      select('openNotification', "Vehicle left open notification", ["Off", "Doors", "Doors & windows"], "Doors & windows"),
    ] },
  ],
  "Display": [
    { title: "Screen", fields: [
      select('appearance', "Appearance", ["Auto", "Light", "Dark"], "Dark"), brightness,
      toggle('autoBrightness', "Auto brightness", true), toggle('reduceBlue', "Reduce blue light", false),
      select('textSize', "Text size", ["Standard", "Large"], "Standard"), action('cleanScreen', "Screen cleaning mode"),
    ] },
    { title: "Formats & units", fields: [
      select('timeFormat', "Time format", ["12-hour", "24-hour"], "12-hour"),
      select('energyDisplay', "Energy display", ["Percentage", "Distance"], "Percentage"),
      select('distanceUnit', "Distance", ["Kilometers", "Miles"], "Kilometers"), select('temperatureUnit', " temperature", ['°C', '°F'], '°C'),
      select('pressureUnit', "Tire pressure", ['BAR', 'PSI'], 'BAR'),
    ] },
    { title: "Language & shortcuts", fields: [
      select('voiceLanguage', "Voice recognition language", ["Mandarin", "English"], "English"),
      select('scrollAction', "Left scroll wheel long press", [" temperature", "Fan speed", "Brightness", "Dashcam"], " temperature"),
    ] },
  ],
  "Dynamics": [
    { title: "Driving feel", fields: [
      select('acceleration', "Acceleration", ["Chill", "Standard"], "Standard", "Chill mode gives the accelerator a gentler response."),
      select('steeringWeight', "Steering weight", ["Light", "Standard", "Heavy"], "Standard"),
    ] },
    { title: "Deceleration & stopping", fields: [
      select('regeneration', "Regenerative braking", ["Low", "Standard"], "Standard"),
      select('stoppingMode', "Stopping mode", ["Creep", "Roll", "Hold"], "Hold", "Hold mode keeps the brakes applied after the vehicle stops."),
      toggle('brakeAssist', "Apply brakes when regen is limited", true, "Use the brakes to maintain consistent deceleration when battery regeneration is limited."),
    ] },
    { title: "Traction", fields: [toggle('slipStart', "Slip Start", false, "Use when starting on snow, sand or mud.")] },
  ],
  "Safety": [
    { title: "Parked protection", fields: [
      toggle('sentry', "Sentry Mode", false, "Monitor suspicious activity around the parked vehicle."),
      toggle('sentryHome', "Exclude Home", true, undefined, 'sentry'), toggle('sentryWork', "Exclude Work", false, undefined, 'sentry'),
      toggle('securityAlarm', "Security alarm", true),
    ] },
    { title: "Video recording", fields: [
      select('dashcam', "Dashcam", ["Off", "Manual", "Auto"], "Auto"), toggle('saveOnHorn', "Save clips on honk", true),
      action('saveClip', "Save Dashcam clip"),
    ] },
    { title: "Access & driving", fields: [
      toggle('mobileAccess', "Allow mobile access", true), toggle('joeMode', "Joe Mode", false, "Reduce the volume of some alerts."),
      action('drivePin', "PIN to Drive"), action('glovePin', "Glovebox PIN"),
      toggle('speedLimit', "Speed Limit Mode", false), range('maxSpeed', "Maximum speed", 120, 80, 193, 'km/h', undefined, 'speedLimit'),
      action('powerOff', "Power off"),
    ] },
  ],
  "Service": [
    { title: "Tires & maintenance", fields: [action('wheels', "Wheels & tires"), action('maintenance', "Maintenance guidance")] },
    { title: "Service tools", fields: [
      toggle('wiperService', "Wiper Service Mode", false, "Move the wipers into position for maintenance."),
      action('cameraCalibration', "Camera calibration"), action('washMode', "Car Wash Mode"), action('towing', "Tow Mode"),
    ] },
    { title: "Help & data", fields: [action('manual', "Owner’s Manual"), action('browserData', "Clear browser data"), action('resetSettings', "Reset vehicle settings")] },
  ],
}

export const defaultPreferences: Preferences = Object.fromEntries(Object.values(settingsSections).flatMap(sections => sections.flatMap(section => section.fields)).filter(field => field.initial !== undefined).map(field => [field.id, field.initial!]))
export const preferenceFields = Object.values(settingsSections).flatMap(sections => sections.flatMap(section => section.fields))
export const manualBase = 'https://www.tesla.com/ownersmanual/2017_2023_model3/zh_cn/'
export const pageDescriptions: Record<SettingsPage, string> = {
  "Controls": "Everyday controls within reach", "Autopilot": "Set up assistance for the way you drive", "Lights": "Exterior and cabin lighting", "Locks": "Keys, doors and passenger protection",
  "Display": "Adjust the display and information formats", "Dynamics": "Customize the driving feel", "Safety": "Parked protection and vehicle access", "Service": "Vehicle status, maintenance and help",
}

// Dialog preferences are validated separately from the visible fields.
export const dialogDefaults: Preferences = { wheels: "18-inch Aero", tires: "All-season", drivePin: false, glovePin: false, mirrorLeftX: 0, mirrorLeftY: 0, mirrorRightX: 0, mirrorRightY: 0, steeringX: 0, steeringY: 0, headlightAimX: 0, headlightAimY: 0 }
Object.assign(defaultPreferences, dialogDefaults)
