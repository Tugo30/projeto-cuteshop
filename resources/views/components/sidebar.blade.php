<div id="sidebar"></div>

<script>
  window.authUser = {
    username: "{{ Auth::user()->username }}",
    role: "{{ Auth::user()->role->nome ?? '' }}"
  };
</script>