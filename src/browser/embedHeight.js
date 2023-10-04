window.addEventListener(
  'message',
  ({ data }) => {
    if (data.webcmUpdateHeight) document.getElementById(data.id).height = data.h
  },
  false
)
