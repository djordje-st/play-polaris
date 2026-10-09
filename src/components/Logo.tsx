export function Logo(props: { class?: string }) {
  return (
    <img
      src="/favicon.png"
      width="28"
      height="28"
      alt=""
      class={`shrink-0 rounded-md ${props.class ?? 'size-7'}`}
    />
  )
}
