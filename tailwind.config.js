// https://huemint.com/website-1/
// https://fontjoy.com/
module.exports = {
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				'primary': {
					light: '#0b2c24',
					dark: '#f6faf9',
				},
				'secondary': {
					light: '#da5251',
					dark: '#ee582c',
				},
				'background': {
					light: '#dff1d2',
					dark: '#1e2a3b',
				}
			},
			fontFamily: {
				sans: ['Open', 'sans-serif'],
				poppins: ['Poppins', 'sans-serif']
			},
			extend: {
				spacing: {
					'128': '32rem',
					'144': '36rem',
				},
				borderRadius: {
					'4xl': '2rem',
				}
			}
		}
	}
}