---
title: Dotfiles
author: David Wood
date: 2017-12-17
tags:
  - dotfiles
  - yadm
  - zsh
  - bash
  - fzf
  - ripgrep
  - fasd
  - tmux
---

There's one project that I've been working on for well over a year alongside everything else - my dotfiles. Dotfiles are repositories where you keep track of your configuration - `.bashrc`, `.zshrc`, `.vimrc`, that sort of thing. In this writing, I'll go over how I manage my dotfiles and some of the key configurations that I find useful in bash, zsh, tmux and Vim.

**Note:** I change my dotfiles regularly so I can't guarantee that I'll keep this up to date. To keep up with the latest changes, [look at the repository on GitLab](https://gitlab.com/davidtwco/dotfiles).

I've made sure that this configuration works within Bash for Windows (which is my primary environment) with  Ubuntu and in ArchLinux (that I [recently wrote about](/writings/2017/archlinux-on-the-windows-subsystem-for-linux)) and on Ubuntu Server. I can't guarantee it will work without some minor changes on other distros but I wouldn't expect any major changes are needed.

# yadm
[yadm](https://thelocehiliosan.github.io/yadm/) (Yet Another Dotfiles Manager) is a dotfile management utility that creates a headless Git repository (in `~/.yadm/repo`) that is used to track changes in the home directory. It sets some Git configuration options that are more suited to dotfile management (such as not showing untracked files by default, since that would be everything in the home directory). Because yadm just manages a Git repository, yadm's commands and arguments are just that of git, in fact, yadm is just an special alias of git.

yadm will also run the `~/.yadm/bootstrap` script that can be included within the repo to set anything up after cloning - I use this to install Vim plugins, tmux plugins, zsh plugins, create symlinks and clone submodules. I highly recommend using yadm to manage your dotfiles, it works great and is available on every distro that I've used.

# zsh (and bash)
I primarily use zsh as my shell, but I try to keep my bash configuration on par as much as possible in case I'm forced to use it. I've included some of the key things I've found to be useful below. You can find [my full zsh configuration on GitLab](https://gitlab.com/davidtwco/dotfiles/blob/master/.zshrc).

## Helper Functions
I don't use many helper functions in my zsh configuration, but one that is really useful is a small function that simplifies checking if a command is available on a system:

```bash
_has() {
    which $1>/dev/null 2>&1
}

if _has gpg-agent; then
    echo "I know this command exists now"
fi
```

## GPG (and SSH) Agent
For quite a while now, I've signed all my commits with my GPG key, doing so has required that I run `gpg-agent` in order to cache my key and limit how much I need to re-enter my passphrase. I've also recently switched to using `gpg-agent` to manage my SSH keys. The advantage of this is that there is a single daemon running and that I only need to enter my GPG key passphrase to use the SSH keys, therefore reducing the amount of passphrases I need to know. The following snippet works on bash and zsh.

```bash
export GPG_TTY=$(tty)
export SSH_AUTH_SOCK="$HOME/.gnupg/S.gpg-agent.ssh"
if _has gpg-agent; then
    eval "$(gpgconf --launch gpg-agent)"
    echo UPDATESTARTUPTTY | gpg-connect-agent 1>/dev/null
fi

# If the SSH agent is running then add any keys.
if [ "$SSH_AUTH_SOCK" ] && [ $(ssh-add -l >| /dev/null 2>&1; echo $?) = 1 ]; then
    ssh-add
fi
```

On its own, the above snippet won't enable SSH support, for that you'll need to set up your `~/.gnupg/gpg-agent.conf` file:

```ini
# Wait an hour before prompting again, always
# prompt if it has been 2 hours, regardless most
# recent use.
default-cache-ttl 600
max-cache-ttl 7200

# Don't prompt for ssh. This is primarily so that
# async repository checks by prompts don't trigger
# random pinentry prompts.
default-cache-ttl-ssh 34560000
max-cache-ttl-ssh 34560000

# Act as an SSH agent.
enable-ssh-support

# Use pinentry-curses for prompt.
pinentry-program /usr/bin/pinentry-curses
```

While not required, I'd recommend you look over [my GPG configuration](https://gitlab.com/davidtwco/dotfiles/blob/master/.gnupg/gpg.conf) for some more improvements.

## Path Management
Managing the `PATH` variable is a relatively minor thing, but there are a handful of small things that we can do to simplify it in zsh. The below snippet ensures that the `PATH` does not contain any duplicates or directories that do not exist.

```bash
# In zsh, the $PATH variable is tied to the $path variable.
# This makes the $path variable act like a set.
typeset -U path

# Add our directories.
path=("$HOME/bin" $path)
path=("$HOME/.cargo/bin" $path)
path=("$HOME/.go/bin" $path)
path=("$HOME/.local/bin" $path)
path=("/opt/puppetlabs/bin" $path)
path=("$HOME/.fzf/bin" $path)

# Using the (N-/) glob qualifier we can remove paths that do not exist.
path=($^path(N-/))
```

## History
I make use of `CTRL+R` for reverse history search regularly (make sure to read the later section on fzf for more improvements), therefore I want to have the history store a lot of commands. Given that I also work within tmux a majority of the time, I want to make sure that every command is persisted to the history from all windows, panes and sessions but that they aren't loaded straight away so as not to interfere with the intuitive behaviour of the up and down arrow keys.

```bash
# Keep 10000000 lines of history within the shell and save it to ~/.zsh_history:
HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000000
SAVEHIST=10000000

# Treat the '!' character specially during expansion.
setopt BANG_HIST
# Write the history file in the ":start:elapsed;command" format.
setopt EXTENDED_HISTORY
# Write to the history file immediately, not when the shell exits.
setopt INC_APPEND_HISTORY
# Share history between all sessions.
setopt NO_SHARE_HISTORY
# Expire duplicate entries first when trimming history.
setopt HIST_EXPIRE_DUPS_FIRST
# Don't record an entry that was just recorded again.
setopt HIST_IGNORE_DUPS
# Delete old recorded entry if new entry is a duplicate.
setopt HIST_IGNORE_ALL_DUPS
# Do not display a line previously found.
setopt HIST_FIND_NO_DUPS
# Don't record an entry starting with a space.
setopt HIST_IGNORE_SPACE
# Don't write duplicate entries in the history file.
setopt HIST_SAVE_NO_DUPS
# Remove superfluous blanks before recording entry.
setopt HIST_REDUCE_BLANKS
# Don't execute immediately upon history expansion.
setopt HIST_VERIFY
```

## antibody
I don't use a lot of plugins in zsh. I prefer not to rely on frameworks like `oh-my-zsh` - I find it is bloated, most of the plugins don't do much and slows everything down. [antibody](https://github.com/getantibody/antibody) is a zsh plugin manager that is designed to be fast.

I use antibody in a static loading configuration where plugins are read from `.antibody_bundle` and downloaded, then all that is performed on subsequent shell start-ups is the loading - nothing else.

```bash
if _has antibody; then
    # If plugins have not been downloaded, then download and static load in future.
    if [[ ! -e "$HOME/.zsh_plugins.sh" ]]; then
        # Fetch plugins.
        antibody bundle < "$HOME/.antibody_bundle" > "$HOME/.zsh_plugins.sh"
    fi

    # Load plugins.
    source "$HOME/.zsh_plugins.sh"
fi
```

I install antibody in the `.yadm/bootstrap` script. In my `.antibody_plugins`, I have the following plugins:

```ini
mafredri/zsh-async
zsh-users/zsh-completions
zsh-users/zsh-autosuggestions

# These plugins must be last.
sindresorhus/pure
zdharma/fast-syntax-highlighting
zdharma/history-search-multi-word
```

Each line contains the user or group and project name from GitHub. `mafredri/zsh-async` is a dependency of my preferred prompt, `sindresorhus/pure` that I'll discuss in a later section. `zsh-users/zsh-completions` adds new completions, including the completions from `oh-my-zsh` that would normally require lots of plugin loading. `zsh-autosuggestions` provides nice completion of commands as they're typed. `zdharma/fast-syntax-highlighting` is a optimized version of `zsh-users/zsh-syntax-highlighting` that highlights commands, flags, interpolation and a bunch of other things. `zdharma/history-search-multi-word` is an optimized version of `zsh-users/zsh-history-substring-search` that improves history search.

## fasd
[fasd](https://github.com/clvv/fasd) is a utility that keeps track of files and directories that are visited and allows for quick jumping back to them. If I am in a folder called `personal-website` (like I am writing this), then I can run `z per` and quickly jump to this directory. I install fasd from the system package manager and only start using it if it is available like below:

```bash
if _has fasd; then
    fasd_cache="$ZSH_CACHE_DIR/fasd-init-cache"
    if [ "$(command -v fasd)" -nt "$fasd_cache" -o ! -s "$fasd_cache" ]; then
        fasd --init posix-alias zsh-hook zsh-ccomp zsh-ccomp-install >| "$fasd_cache"
    fi
    source "$fasd_cache"
    unset fasd_cache
fi
```

I add a bunch more aliases in my `.aliases` script (that I'll cover more later) for fasd.

```bash
# If fasd is installed and in use, add a bunch of
# aliases for it.
if command -v fasd >/dev/null 2>&1; then
    # Any
    alias a='fasd -a'

    # Show/search/select
    alias s='fasd -si'

    # Directory
    alias d='fasd -d'

    # File
    alias f='fasd -f'

    # Interactive directory selection
    alias sd='fasd -sid'

    # Interactive file selection
    alias sf='fasd -sif'

    # cd - same functionality as j in autojump
    alias z='fasd_cd -d'

    # Interactive cd
    alias zz='fasd_cd -d -i'

    # Vim
    alias v='fasd -f -e vim'
fi
```

## fzf
I use another utility, [fzf](https://github.com/junegunn/fzf), for fuzzy finding files (not including files in `.gitignore`) in the terminal and also as a replacement for [`ctrlp` in Vim](https://github.com/ctrlpvim/ctrlp.vim). fzf is installed by my Vim plugin manager.

```bash
# fzf via Homebrew
if [ -e /usr/local/opt/fzf/shell/completion.zsh ]; then
    source /usr/local/opt/fzf/shell/key-bindings.zsh
    source /usr/local/opt/fzf/shell/completion.zsh
fi

# fzf via local installation
if [ -f ~/.fzf.zsh ]; then
    source ~/.fzf.zsh
fi
```

fzf can be backed by [ag, the silver searcher](https://github.com/ggreer/the_silver_searcher), [ripgrep](https://github.com/BurntSushi/ripgrep) or any grep alternative, I specify a small hierarchy of preferred utilities in my config, as shown below:

```bash
# fzf + ag configuration
if _has fzf && _has ag; then
    export FZF_DEFAULT_COMMAND='ag --nocolor -g ""'
    export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
    export FZF_ALT_C_COMMAND="$FZF_DEFAULT_COMMAND"
    export FZF_DEFAULT_OPTS='
    --color fg:242,bg:236,hl:65,fg+:15,bg+:239,hl+:108
    --color info:108,prompt:109,spinner:108,pointer:168,marker:168
    '
fi

# fzf + ripgrep configuration
if _has fzf && _has rg; then
    export FZF_DEFAULT_COMMAND='rg --files --hidden --follow -g "!{.git}" 2>/dev/null'
    export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
    export FZF_DEFAULT_OPTS=''
fi
```

## pure Prompt
I use the [pure](https://github.com/sindresorhus/pure) prompt - it looks good, doesn't contain lots of useless features and is fast. In order to have pure work with zsh's Vi-mode, I invoke pure in the following way:

```bash
autoload -Uz promptinit; promptinit

VIM_PROMPT="❯"
PROMPT='%(12V.%F{242}${psvar[12]}%f .)'
PROMPT+='%(?.%F{magenta}.%F{red})${VIM_PROMPT}%f '

PURE_GIT_DOWN_ARROW='↓'
PURE_GIT_UP_ARROW='↑'

prompt_pure_update_vim_prompt() {
    zle || {
        print "error: pure_update_vim_prompt must be called when zle is active"
        return 1
    }
    VIM_PROMPT=${${KEYMAP/vicmd/❮}/(main|viins)/❯}
    zle .reset-prompt
}

function zle-line-init zle-keymap-select {
    prompt_pure_update_vim_prompt
}
zle -N zle-line-init
zle -N zle-keymap-select
```

I'd also look into [geometry](https://github.com/geometry-zsh/geometry) and [spaceship](https://github.com/denysdovhan/spaceship-zsh-theme) if you're looking for nice prompts. If you prefer bash, check out the version of pure that I include for bash [in the dotfiles](https://gitlab.com/davidtwco/dotfiles/blob/master/.bash_prompt).

## Aliases
In addition to the fasd aliases that I mentioned above, I define the following aliases in a `.aliases` file that is included in `.zshrc` and `.bashrc`:

```bash
# 'rm' will prompt once before
#  - removing more than three files.
#  - removing recursively.
alias rm='rm -I'

# Enable color support of ls and also add handy aliases.
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    #alias dir='dir --color=auto'
    #alias vdir='vdir --color=auto'

    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# More ls aliases.
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'
```

## Alternative coreutils
I've replaced a handful of normal utilities, such as ls and find with some alternatives. I would recommend looking into using [fd](https://github.com/sharkdp/fd) as an alternative to find; [ripgrep](https://github.com/BurntSushi/ripgrep/) as an alternative to ag or grep; and [exa](https://github.com/ogham/exa) as an alternative to ls, as shown below:

```bash
# Replace 'ls' with exa if it is available.
if command -v exa >/dev/null 2>&1; then
    alias ls="exa --git --color=automatic"
    alias ll="exa --all --long --git --color=automatic"
    alias la="exa --all --binary --group --header --long --git --color=automatic"
    alias l="exa --git --color=automatic"
fi
```

# Vim
Vim is my primary editor, it's probably the most configured thing in my dotfiles. There are a bunch of small miscellaneous configuration options that don't quite warrant their own section that I'll list here:

```vim
" Vim should create hidden buffers more liberally.
" ie. it should not prompt when switching between
" open files (in buffers) when those files have changes.
set hidden

" We can delete backwards over anything.
set backspace=indent,eol,start

" Map %% to the current opened file's path.
cnoremap %% <C-R>=fnameescape(expand('%:h')).'/'<CR>
" Map helpful commands for editing files in that directory. (leader defaults to \)
map <leader>ew :e %%
map <leader>es :sp %%
map <leader>ev :vsp %%
map <leader>et :tabe %%

" Enable folding.
set foldenable
" Open 10 levels of folds by default.
set foldlevelstart=10
" 10 nested folds max.
set foldnestmax=10
" Fold based on indentation (for Python)
set foldmethod=indent

" Increase history.
set history=1000

" Sets the expected modeline format.
set modelines=1

" Automatically reload files if changed from outside.
set autoread

" Highlight matches.
set hlsearch
" Highlight matches as we type.
set incsearch
" Ignore case when searching.
set ignorecase
" Don't ignore case when different cases searched for.
set smartcase

" Keep a minimum of 5 line below the cursor.
set scrolloff=5
" Keep a minimum of 5 columns left of the cursor.
set sidescrolloff=5

" Spell check!
set spelllang=en_gb
set spellfile=~/.vim/spell/en-gb.utf-8.add

" Turn on wildmenu for file name tab completion.
set wildmode=longest,list,full
set wildmenu

" This should make pressing ESC more responsive.
" Alternative to `set esckeys` as this breaks
" sequences in INSERT mode that uses ESC.
set timeoutlen=250 ttimeoutlen=0

" Show ruler.
set ruler
" Show incomplete commands.
set showcmd
" Highlight the current line.
set nocursorline
" Lazy redraw.
set lazyredraw
" Line Numbers
set number
" Display messages for changes (ie. yank, delete, etc.)
set report=0
" Show matching brackets.
set showmatch
" Matching bracket duration.
set mat=5
" Shut up, Vim.
set visualbell
" Always show the status line.
set laststatus=2
" Use Relative Line Numbers.
set relativenumber
" Don't display '-- INSERT --', handled by statusline.
set noshowmode
" Colour 40 columns after column 80.
let &colorcolumn="100,".join(range(140, 1000, 40), ",")

" Display the tab characters and end of line characters.
set list
set listchars=tab:▸\ ,eol:¬
```

The best thing you can do for learning Vim is to read every blog post like this one that you can find. Everyone finds a new configuration option or plugin that will improve your experience.

## vim-plug
I chose to use `vim-plug` to manage my plugins. I've found that it is fast and supports all the features I need. I use a ton of plugins, so I'll only highlight some of my most used plugins. If you want to see the exhaustive list, [check out my configuration on GitLab](https://gitlab.com/davidtwco/dotfiles/blob/master/.vimrc). I clone `vim-plug` as a submodule in the repo.

I think the most used plugins in any Vim user's toolbelt are going to be the various plugins by Tim Pope:

```vim
" Comments.
Plug 'tpope/vim-commentary'

" Improvements to netrw.
Plug 'tpope/vim-vinegar'

" Git wrapper.
Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-rhubarb'

" Detect indentation heuristically.
Plug 'tpope/vim-sleuth'

" Word variation helper.
Plug 'tpope/vim-abolish'
" Improve '.' (repeat) for plugin maps.
Plug 'tpope/vim-repeat'
" Get character codes.
Plug 'tpope/vim-characterize'

if has("unix")
    " Unix helpers
    Plug 'tpope/vim-eunuch'
endif

" Functions that interact with tmux.
Plug 'tpope/vim-tbone'

" Session Saving
Plug 'tpope/vim-obsession'

" Handy bracket matchings.
Plug 'tpope/vim-unimpaired'
" Surroundings ("", '', {}, etc.).
Plug 'tpope/vim-surround'
" Auto-adds 'end' where appropriate.
Plug 'tpope/vim-endwise'
```

All of the above are great, in particular [vim-surround](https://github.com/tpope/vim-surround), [vim-eunuch](https://github.com/tpope/vim-eunuch) and [vim-commentary](https://github.com/tpope/vim-commentary). I also make regular use of the following plugins:

```vim
" Autocomplete
Plug 'Valloric/YouCompleteMe', { 'do': './install.py' }

" Add handy bindings for You Complete Me subcommands.
nnoremap <leader>fi :YcmCompleter FixIt<CR>
nnoremap <leader>gd :YcmCompleter GoTo<CR>
nnoremap <leader>gt :YcmCompleter GetType<CR>
nnoremap <leader>gp :YcmCompleter GetParent<CR>
nnoremap <leader>sd :YcmShowDetailedDiagnostic<CR>

" Do not confirm usage of .ycm_extra_conf.py
let g:ycm_confirm_extra_conf = 0
```

[YouCompleteMe](https://github.com/Valloric/YouCompleteMe) is a great autocompletion plugin for a variety of languages. It has a good understanding of the languages it supports and provides a bunch of functions for jumping around a codebase.

```vim
" Linting
Plug 'w0rp/ale'

let g:ale_echo_msg_error_str = 'E'
let g:ale_echo_msg_warning_str = 'W'
let g:ale_echo_msg_format = '[%linter%] %s [%severity%]'

let g:ale_linters = {
\   'asm': [],
\}

nmap <C-n> <Plug>(ale_next_wrap)
```

[Ale](https://github.com/w0rp/ale) is a async linting engine that supports pretty much every language you can think of.

```vim
" Show Git changes.
Plug 'mhinz/vim-signify'

" Specify which VCS to check for.
let g:signify_vcs_list = [ 'git' ]
" Work in near-realtime.
let g:signify_realtime = 1
" Disable two of the sign update methods as they write the buffer.
let g:signify_cursorhold_normal = 0
let g:signify_cursorhold_insert = 0

```

[Signify](https://github.com/mhinz/vim-signify) adds the current Git changes to the sign column on the left hand side of Vim. I find it's immensely helpful in keeping track of changes.

```vim
" Colour Schemes
Plug 'w0ng/vim-hybrid'
```

[vim-hybrid](https://github.com/w0ng/vim-hybrid) is a excellent colour scheme (in fact, it's the colour scheme that all the code on this page is using).

## Helper Functions
There are a handful of helper functions that I include in my Vim configuration. First up, I include the following function to strip trailing whitespace from the end of the lines. I make sure that it is run whenever a file is saved.

```vim
" Strip trailing whitespace on saving a file.
function! <SID>StripTrailingWhitespaces()
    let l = line(".")
    let c = col(".")
    %s/\s\+$//e
    call cursor(l, c)
endfun
autocmd BufWritePre * :call <SID>StripTrailingWhitespaces()
```

The next function is used to toggle paste mode. I'm always using paste mode when copying snippets of things from other editors, various websites and chat applications - being able to switch back and forth is really useful.

```vim
" Toggle between paste and no paste.
function! TogglePaste()
    if(&paste == 1)
        set nopaste
        echom "Switched to no paste."
    else
        set paste
        echom "Switched to paste."
    endif
endfunc
nmap <silent> <leader>p :call TogglePaste()<CR>
```

Recently I started using relative line numbering, in order to ease the switch, I added a function to toggle between relative line numbering and absolute line numbering.

```vim
" Toggle between absolute line numbers and relative line numbers.
function! ToggleNumber()
    if(&relativenumber == 1)
        set norelativenumber
        set number
        echom "Switched to absolute line numbers."
    else
        set relativenumber
        echom "Switched to relative line numbers."
    endif
endfunc
nmap <silent> <leader>l :call ToggleNumber()<CR>
```

## fzf
I use the following bindings with the [Fzf.vim](https://github.com/junegunn/fzf.vim) plugin to emulate the fuzzy file search of [CtrlP.vim](https://github.com/ctrlpvim/ctrlp.vim):

```vim
nnoremap <c-p> :Files<CR>
nnoremap <leader>pf :Files<CR>
nnoremap <leader>pg :GFiles<CR>
nnoremap <leader>pc :Commits<CR>
nnoremap <leader>pb :Buffers<CR>

" Mapping selecting mappings
nmap <leader><tab> <plug>(fzf-maps-n)
xmap <leader><tab> <plug>(fzf-maps-x)
omap <leader><tab> <plug>(fzf-maps-o)

" Insert mode completion
imap <c-x><c-k> <plug>(fzf-complete-word)
imap <c-x><c-f> <plug>(fzf-complete-path)
imap <c-x><c-j> <plug>(fzf-complete-file-ag)
imap <c-x><c-l> <plug>(fzf-complete-line)
```

## Lightline
[Lightline](https://github.com/itchyny/lightline.vim) is a light and configurable statusline for Vim. I prefer it over [vim-airline](https://github.com/vim-airline/vim-airline) because it's faster in my experience.

I use the following configuration for Lightline:

```vim
let g:lightline = {
\     'colorscheme': 'hybrid',
\     'active': {
\       'left': [
\           [ 'mode' ],
\           [ 'paste', 'spell', 'gitbranch', 'readonly', 'filename' ]
\       ],
\       'right': [
\           [ 'lineinfo' ],
\           [ 'percent' ],
\           [ 'obsession', 'fileformat', 'fileencoding', 'filetype', 'charvaluehex' ]
\       ]
\     },
\     'component_function': {
\       'gitbranch': 'fugitive#head',
\       'obsession': 'ObsessionStatus',
\       'readonly': 'LightlineReadonly',
\       'fileformat': 'LightlineFileformat',
\       'filetype': 'LightlineFiletype',
\       'filename': 'LightlineFilename'
\     }
\ }
```

I define a handful of components myself: `LightlineFilename`, `LightlineReadonly`, `LightlineFileFormat`, `LightlineFiletype`.  `ObsessionStatus` and `fugitive#head` are functions exposed by the `vim-obsession` and `vim-fugitive` plugins.

The biggest of the four is `LightlineFilename` which I built to emulate the filename in `vim-airline`.

The modifications enable long filepaths to be shortened, for example, `content/writings/2017-12-17-dotfile-management.md` gets shortened to `c/w/2017-12-17-dotfile-management.md` so that it can fit alongside other filenames if there are lots of splits.

```vim
function! LightlineFilename()
    " Get the full path of the current file.
    let filepath =  expand('%:p')
    let modified = &modified ? ' +' : ''

    " If the filename is empty, then display nothing as appropriate.
    if empty(filepath)
        return '[No Name]' . modified
    endif

    " Find the correct expansion depending on whether Vim has autochdir.
    let mod = (exists('+acd') && &acd) ? ':~' : ':~:.'

    " Apply the above expansion to the expanded file path and split by the separator.
    let shortened_filepath = fnamemodify(filepath, mod)
    if len(shortened_filepath) < 45
        return shortened_filepath.modified
    endif

    " Ensure that we have the correct slash for the OS.
    let dirsep = has('win32') && ! &shellslash ? '\\' : '/'

    " Check if the filepath was shortened above.
    let was_shortened = filepath != shortened_filepath

    " Split the filepath.
    let filepath_parts = split(shortened_filepath, dirsep)

    " Take the first character from each part of the path (except the tidle and filename).
    let initial_position = was_shortened ? 0 : 1
    let excluded_parts = filepath_parts[initial_position:-2]
    let shortened_paths = map(excluded_parts, 'v:val[0]')

    " Recombine the shortened paths with the tilde and filename.
    let combined_parts = shortened_paths + [filepath_parts[-1]]
    let combined_parts = (was_shortened ? [] : [filepath_parts[0]]) + combined_parts

    " Recombine into a single string.
    let finalpath = join(combined_parts, dirsep)
    return finalpath . modified
endfunction
```

Other than that, all of the other components are the same as the Lightline equivalent but will collapse if the window isn't very wide.

```vim
function! LightlineFileformat()
    return winwidth(0) > 70 ? &fileformat : ''
endfunction
function! LightlineFiletype()
    return winwidth(0) > 70 ? (&filetype !=# '' ? &filetype : 'no ft') : ''
endfunction
function! LightlineReadonly()
    return &readonly && &filetype !=# 'help' ? 'RO' : ''
endfunction
```

## Undo/Backups
I don't like losing my edit history in Vim when resuming an editor session, but I also don't like dealing with `*.swp` files everywhere. However, one of the main issues with changing the swap or undo directories is that you become vulnerable to filename conflicts between projects - which is quite common when you've got files like `package.json` or `Cargo.toml`. This can be remedied if you end a path with `//` - Vim replaces this will the entire path to the file being edited - no more collisions.

```vim
" If a path ends in '//' then the swap file name is
" built from the entire path. No more issues between projects.

" Change swap directory.
if isdirectory($HOME . '/.vim/swap') == 0
    call mkdir($HOME . '/.vim/swap', 'p')
endif
set directory=~/.vim/swap//

" Change backup directory.
if isdirectory($HOME . '/.vim/backup') == 0
    call mkdir($HOME . '/.vim/backup', 'p')
endif
set backupdir=~/.vim/backup//

if exists('+undofile')
    " Change undo directory.
    if isdirectory($HOME . '/.vim/undo') == 0
        call mkdir($HOME . '/.vim/undo', 'p')
    endif
    set undodir=~/.vim/undo//
end
```

Another issue with having swap files enabled is that you'll often be prompted to recover or delete those swap files if you have a tendency to close Vim incorrectly. Luckily, this can be solved with the use of the `AutoSwap` event. Using the `v` argument in the callback, I can direct Vim to automatically delete or recover swapfiles. The below snippet deletes swapfiles that was modified before the source file.

```vim
if has("autocmd")
    augroup AutoSwap
        autocmd!
        autocmd! SwapExists * call _HandleSwap(expand('<afile>:p'))
    augroup END
endif

function! _HandleSwap(filename)
    " If the swap file is old, delete. If it is new, recover.
    if getftime(v:swapname) < getftime(a:filename)
        let v:swapchoice = 'e'
        call _EchoSwapMessage("Deleted older swapfile.")
    else
        let v:swapchoice = 'r'
        call _EchoSwapMessage("Detected newer swapfile, recovering.")
    endif
endfunc

function! _EchoSwapMessage(message)
    if has("autocmd")
        augroup EchoSwapMessage
            autocmd!
            " Echo the message after entering a file, useful for
            " when we're entering a file (like on SwapExists)
            " and our echo will be eaten.
            autocmd BufWinEnter * echohl WarningMsg
            exec 'autocmd BufWinEnter * echon "\r'.printf("%-60s", a:message).'"'
            autocmd BufWinEnter * echohl NONE

            " Remove these auto commands so that they don't run on entering the next buffer.
            autocmd BufWinEnter * augroup EchoSwapMessage
            autocmd BufWinEnter * autocmd!
            autocmd BufWinEnter * augroup END
        augroup END
    endif
endfunction
```

# tmux
As I work in the terminal all the time, tmux is an absolute necessity. Despite this, my configuration for tmux is quite small - out of the box, tmux has a very comprehensive feature set for my needs.

## tmux-plugin-manager
I use [tpm](https://github.com/tmux-plugins/tpm) to manage and install plugins for tmux. I include tpm as a submodule that is cloned by yadm. I can then specify the plugins I'd like installed in the tmux configuration like below:

```ini
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'
set -g @plugin 'tmux-plugins/tmux-resurrect'
set -g @plugin 'tmux-plugins/tmux-continuum'
set -g @plugin 'tmux-plugins/tmux-yank'
set -g @plugin 'tmux-plugins/tmux-copycat'
set -g @plugin 'christoomey/vim-tmux-navigator'
set -g @plugin 'NHDaly/tmux-better-mouse-mode'
run '~/.tmux/plugins/tpm/tpm'
```

`tmux-sensible` provides some sane defaults instead of tmux's stranger defaults; `tmux-resurrect` allows me to save and restore sessions; `tmux-continuum` enhances `tmux-resurrect` and saves continuously; `tmux-yank` allows copying to the system clipboard - including in Bash for Windows; `tmux-copycat` allows regex searching in a pane; `vim-tmux-navigator` is an **essential** plugin - allowing `CTRL + j/h/k/l` to jump between Vim splits and tmux panes seamlessly; `tmux-better-mouse-mode` improves using the mouse with tmux by ten-fold in a bunch of ways.

## Statusline
I use [Tmuxline](https://github.com/edkolev/tmuxline.vim) to generate a tmux statusline from my Vim statusline. You can see the [generated statusline here](https://gitlab.com/davidtwco/dotfiles/blob/master/.tmux.statusline.conf).

## Synchronized Panes
One of the features of tmux that I don't use often, but is a lifesaver when I do use it: synchronized panes. Synchronized panes lets me interact with all the panes in a window at once - whatever I type is goes in all panes.

```ini
# CTRL + S will sync panes.
bind S set-window-option synchronize-panes
```

I also override the statusline that was discussed previously to show a red dot next to the window name if it currently synchronized.

```ini
# Override statusline to show if panes are synchronized.
setw -g window-status-format "#[fg=colour7,bg=colour0] #I #[fg=colour7,bg=colour0] #W #{?pane_synchronized,⬣ ,}"
setw -g window-status-current-format "#[fg=colour0,bg=colour8,nobold,nounderscore,noitalics]#[fg=colour15,bg=colour8] #I #[fg=colour15,bg=colour8] #W #{?pane_synchronized,#[fg=red]⬣ #[default],}#[fg=colour8,bg=colour0,nobold,nounderscore,noitalics]"
```

## Aliases
tmux's default keybindings aren't particularly intuitive, I include the following snippet to create some more sensible bindings:

```ini
# CTRL + '|' splits horizontally.
bind | split-window -h
# CTRL + '-' splits vertically.
bind - split-window -v

# CTRL + h,j,k,l for moving.
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# CTRL + H,J,K,L for resizing.
bind H resize-pane -L 5
bind J resize-pane -D 5
bind K resize-pane -U 5
bind L resize-pane -R 5
```

# Bash for Windows
I've worked using Bash for Windows as my primary environment for around a year, there are a handful of additions to my dotfiles that are specifically for that environment.

## Using a different shell
In order to use zsh as my primary shell, I include the following snippet at the top of my `.bashrc`, this checks if I'm running in Bash for Windows and if I have zsh installed. If I do, it is launched as my primary shell.

```bash
# Due to limitations in Bash for Windows, in order to use
# an alternate shell, we must launch it from here. We cannot
# use chsh.
if grep -q Microsoft /proc/version; then
    # If we have zsh installed, use it.
    if which zsh>/dev/null 2>&1; then
        exec zsh
    fi
fi
```

In my tmux configuration, I also add the following:

```ini
set-option -g default-shell /usr/bin/zsh
```

## Using Docker for Windows
When using Docker for Windows, it can be configured to expose the Docker daemon over TCP rather than a named pipe. I can then install Docker within Bash for Windows, and configure it to connect to the exposed Docker for Windows daemon rather than the normal daemon (which wouldn't work) over Unix sockets.

```bash
# Connect to Docker over TCP. Allows connections to Docker for Windows.
if grep -q Microsoft /proc/version; then
    export DOCKER_HOST=tcp://127.0.0.1:2375
fi
```

---

Thanks for reading!
