// Starting point for a property's emergency page. Everything here is editable in the app.
// National numbers checked 11 Nov 2026 (Western Cape Government emergency page; Bizcommunity, 5 Nov 2024:
// 112 is the legal emergency number and 10111 / 10177 still work alongside it).
// Local numbers (fire brigade, FPA, nearest hospital, vet, security) are left blank for the owner to fill in.

export const NATIONAL_CONTACTS = [
  { key: 'cell', name: 'Emergency from a cellphone', organisation: 'All networks', phone: '112', notes: 'Works on any network, even without airtime.' },
  { key: 'police', name: 'Police (Flying Squad)', organisation: 'SAPS', phone: '10111' },
  { key: 'ambulance', name: 'Ambulance', organisation: 'Emergency Medical Services', phone: '10177' },
  { key: 'fire', name: 'Fire brigade', organisation: 'District municipality fire & rescue', phone: '', notes: 'Fill in your district’s fire number.' },
  { key: 'fpa', name: 'Fire Protection Association', organisation: 'Local FPA', phone: '', notes: 'If the property belongs to an FPA.' },
  { key: 'hospital', name: 'Nearest hospital', organisation: '', phone: '' },
  { key: 'vet', name: 'Vet', organisation: '', phone: '' },
  { key: 'security', name: 'Security / farm or neighbourhood watch', organisation: '', phone: '' },
];

export const PROCEDURES = [
  { title: 'Fire', icon: 'fire', call: 'fire', also: ['fpa', 'cell'], neighbours: true, steps: [
    'Get people away from the fire first. Count everyone.',
    'Call the fire brigade: say the property name, the map pin and which way the wind is blowing.',
    'Phone the FPA and warn the neighbours on the list below.',
    'Move vehicles, diesel and livestock out of the fire’s path if it is safe.',
    'Open gates for fire crews and send someone to meet them at the main gate.',
    'Do not fight a big veld fire alone. Stay upwind and keep a way out.',
  ] },
  { title: 'Medical emergency', icon: 'medical', call: 'ambulance', also: ['cell', 'hospital'], neighbours: false, steps: [
    'Make the area safe, then check if the person is breathing.',
    'Call the ambulance: say what happened, how many people, and the map pin.',
    'Do not move someone who may have a neck or back injury unless they are in danger.',
    'Press firmly on heavy bleeding with a clean cloth.',
    'Send someone to the gate to guide the ambulance in.',
  ] },
  { title: 'Snake bite', icon: 'snake', call: 'ambulance', also: ['hospital'], neighbours: false, steps: [
    'Move away from the snake. Do not try to catch or kill it.',
    'Keep the person calm and still; keep the bitten limb still and below heart height.',
    'Remove rings, watches and tight clothing near the bite.',
    'Do not cut, suck or use a tourniquet on the bite.',
    'Call the ambulance and get to hospital fast. A photo of the snake from a safe distance helps.',
  ] },
  { title: 'Crime or stock theft', icon: 'shield', call: 'police', also: ['security'], neighbours: true, steps: [
    'Do not confront armed people. Your safety comes first.',
    'Call the police (10111) and your security company or watch.',
    'Warn the neighbours: vehicle, direction of travel, number of people.',
    'Do not touch tracks, cut fences or gates until the police have seen them.',
    'Write down times and descriptions, take photos, and get the case number.',
  ] },
  { title: 'Vehicle accident', icon: 'truck', call: 'cell', also: ['ambulance', 'police'], neighbours: false, steps: [
    'Switch off the engine and make the scene safe; watch for leaking fuel.',
    'Call 112: say where, how many people are hurt, and if anyone is trapped.',
    'Do not move injured people unless there is fire or other danger.',
    'Report it to the police and take photos of the scene.',
  ] },
];
