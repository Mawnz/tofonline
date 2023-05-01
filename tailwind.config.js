// https://huemint.com/website-1/
// https://fontjoy.com/
module.exports = {
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				'primary': {
					light: '#2e3537',
					dark: '#f8f8f6',
				},
				'secondary': {
					light: '#f65562',
					dark: '#88d3d3',
				},
				'background': {
					light: '#faca00',
					dark: '#1e181d',
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