---
title: ArchLinux on the Windows Subsystem for Linux
author: David Wood
date: 2017-12-14
tags:
  - Windows
  - Linux
  - Windows Subsystem for Linux
  - Bash for Windows
  - ArchLinux
---

I've been using Bash for Windows as my primary development environment (with Vim and tmux) for around a year or so now. One of my major issues with it has been being stuck on Ubuntu 16.04 - in order to get more recent versions of packages I've had to build them myself or wait. It's also stopped me from experimenting with some interesting distributions such as [NixOS](https://nixos.org/) as I've not wanted to dual boot on a Surface device - even though the community at [r/SurfaceLinux](https://reddit.com/r/surfacelinux) is making great progress with compatibility. Before using Ubuntu in WSL, I used [ArchLinux](https://archlinux.org/) and I definitely miss having everything running the latest versions.

I've recently found a way to install ArchLinux alongside Ubuntu in WSL. This has been possible for quite some time. WSL has always taken a root filesystem (normally from Ubuntu and located in `%AppData%` somewhere) and provided its own kernel with Windows emulating the syscalls - resulting in the Bash for Windows we're used to. Therefore, it's always been possible to replace the rootfs with one from ArchLinux and have your preferred distro in WSL. However, I was never particularly enthused by this method, I didn't like replacing the Ubuntu files (even though you could roll it back), so I always gave it a pass.

In the recent Fall Creators Update, Microsoft introduced the ability to run multiple distributions installed from the Windows Store - Ubuntu, OpenSUSE and Fedora. With this new ability came the [wslconfig utility](https://docs.microsoft.com/en-us/windows/wsl/wsl-config). The interface exposed by `wslconfig` doesn't provide a method for installing your own custom distributions though. I've since discovered that the WSL Management API is available through the Windows SDK (thanks to an [excellent blog post](https://brianketelsen.com/getting-crazy-with-windows-subsystem-for-linux/) by Brian Ketelsen) and that there are some tools available to install distributions alongside Ubuntu. One such tool is [LxRunOffline](https://github.com/DDoSolitary/LxRunOffline).

Naturally, I had to install ArchLinux in WSL. Adding the distro isn't that hard, `LxRunOffline` makes it very easy, but once you're in ArchLinux, I found that getting it to a usable state was a little bit of a challenge.

**Note:** The following walkthrough is for installing ArchLinux, but I imagine similar steps and solutions would work on any distro. I'm also assuming that you've used ArchLinux and have some experience with it.

---

To get started, we can check what distos are currently active in WSL by running `wslconfig \l` in command prompt:

```bat
Windows Subsystem for Linux Distributions:
Ubuntu (Default)
```

We'll need [LxRunOffline](https://github.com/DDoSolitary/LxRunOffline), so head to the releases page and download the latest version and unzip it somewhere or use [Chocolatey](https://chocolatey.org/). `LxRunOffline` expects a gzipped tar archive with the root filesystem for the distro you want to install. Luckily, ArchLinux provides this on their downloads page - if you visit one of the mirrors, you'll see a `archlinux-bootstrap-{version}-x86_64.tar.gz` archive available. Download this archive and run the following commands on a Linux system (or within the existing Ubuntu installation, though I run into some issues here that using a regular Linux system avoided, if you're having trouble, [here's a download of the file I produced](https://www.dropbox.com/sh/w3x7ajxwxig3up1/AAAnhLUctzTeAhshV7TJlqcZa?dl=0)):

```bash
tar -xzf archlinux-bootstrap-{version}-x86_64.tar.gz
cd root.x86_64/
tar -czf ../ArchLinux.tar.gz *
cd ..
rm -r root.x86_64/
```

We need to create a folder for the WSL distro to live in, this should be somewhere where you won't accidentally modify a file, doing so will corrupt the distro. I created `C:\WSL` and set it to hidden. Once you've got the `ArchLinux.tar.gz` archive, you can run the following commands with `LxRunOffline` in the PATH or in the folder containing the executable:

```bat
lxrunoffline -n ArchLinux -d C:\WSL\ArchLinux -f C:\path\to\ArchLinux.tar.gz
```

In a few moments you'll have ArchLinux installed, you can verify this by re-running `wslconfig \l` in command prompt:

```bat
Windows Subsystem for Linux Distributions:
Ubuntu (Default)
ArchLinux
```

Now, we need to create a shortcut we can use to access the distro, since we don't have an `ubuntu.exe` like the Windows Store package provides for Ubuntu, we'll need to use the `bash.exe` executable found in `C:\Windows\System32`. If you run `bash.exe` normally then it'll drop you into the existing Ubuntu installation (or into Arch if you don't have an existing Ubuntu installation). If you do have an existing Ubuntu installation, you'll need to find the GUID of the new distro in order to access it.

To do this, open up `regedit` and browse to the following key:

```ini
HKCU\Software\Microsoft\Windows\CurrentVersion\Lxss
```

There will keys for each of the distros installed. If you click through them, you'll see a `DistributionName` key inside, find `ArchLinux` and copy the parent key, it'll look something like `{b8625d5d-1f6e-46b0-8f0e-2a143bc9fed5}`.

Now, create a shortcut that points to `C:\Windows\System32\bash.exe {guid} ~`, replacing `{guid}` with the value you just found in regedit. If you want, you can remove the `~` and the prompt will open in your Windows home directory, but I prefer to work within the WSL filesystem, so `~` will start me there. You can add an icon to the shortcut in the properties for the shortcut, I threw together an icon [that you can get here](https://www.dropbox.com/sh/w3x7ajxwxig3up1/AAAnhLUctzTeAhshV7TJlqcZa?dl=0).

Alternatively, you can run `wslconfig /s ArchLinux` to set the new distro to be the default, running `bash` or `wsl` in command prompt will open it by default in future.

Now we can get into ArchLinux, we need to make it usable. By default, you won't have any text editor (no `vim`, `vi`, `nano` or `ed`), `ping` or most of the utilities you'd come to expect. This presents a challenge. We do have `pacman`, but all of the mirrors are commented out in `/etc/pacman.d/mirrorlist` and we don't have `sed` to uncomment them.

We do have networking, however we cannot resolve domain names. Getting DNS resolution working isn't that hard, running the following will add a comment back to the top of `/etc/resolv.conf` and when WSL is re-opened, it will have added some nameservers and we'll be able to resolve domains again:

```bash
echo '# This file was automatically generated by WSL. To stop automatic generation of this file, remove this line.' > /etc/resolv.conf
```

Once WSL has been restarted, we'll be able to resolve domains - this makes getting `pacman` working again a bunch easier. To proceed further, find a mirror on [the ArchLinux website](https://www.archlinux.org/mirrors/status/) that is available over HTTP (without packages we won't have root certificates for TLS negotiation). Running the following command with your chosen mirror will append it to the mirrorlist file:

```bash
echo 'Server = http://mirror.euserv.net/linux/archlinux/' >> /etc/pacman.d/mirrorlist
```

Now that we have a mirror, running `pacman -Syu base base-devel` should update and install the regular packages that we've come to expect on a system. However, you'll find that you run into some GPG key errors, this is easily fixed. Running `pacman-key --init` will initialize the keyring used by pacman. None of the keys that packages are signed with will be present though, so we'll need to install the `archlinux-keyring` package somehow.

If we visit the page for the [archlinux-keyring](https://www.archlinux.org/packages/core/any/archlinux-keyring/) package, then we can click the `Download from mirror` button on the right side, this will download a tar archive. If we copy this file into the new distro (`cp` it from `/mnt/c`) then run the following, we'll install the package:

```bash
pacman -U archlinux-keyring-20171130-1-any.pkg.tar.xz
```

Now that we've got keys, we can finally install the standard system packages:

```bash
pacman -Syu base base-devel
```

We'll need to create our normal user and make it the default user so that we aren't running everything as root - to do this, [follow the normal instructions for adding a user](https://wiki.archlinux.org/index.php/users_and_groups#Example_adding_a_user) and then run `Lxrunoffline.exe config-uid -n ArchLinux -v {UID}` in command prompt, replacing `{UID}` with the user id of the user you just created (run `id`).

At this point, the system is more or less ready to go, but you'll notice some issues when trying to build packages from the AUR (such as [pacaur](https://aur.archlinux.org/packages/pacaur/) or it's dependency `cower`). This is because WSL doesn't support `fakeroot`, which is required by `makepkg`. Previously there were also issues with `glibc` and WSL, but these were resolved in the Fall Creators Update.

In order to get around this, we can install [fakeroot-tcp](https://aur.archlinux.org/packages/fakeroot-tcp/). However, installing an AUR packages requires `fakeroot`, which we're trying to fix - so that's not going to work. You can build `fakeroot-tcp` with `makepkg -s` on an existing ArchLinux system and copy the resulting tar archive for installation, or you can download the [version that I built and save yourself the effort](https://www.dropbox.com/sh/w3x7ajxwxig3up1/AAAnhLUctzTeAhshV7TJlqcZa?dl=0).

Once you've got the `fakeroot-tcp` archive, you can install it with:

```bash
pacman -U fakeroot-tcp-1.21-2-x86_64.pkg.tar.xz
```

If you run into any GPG key issues while installing AUR packages, add the keys with `gpg2 --recv-key KEYID`. Now that you've got `fakeroot-tcp`, you can clone and build AUR packages with `makepkg -si` as normal.

I'd recommend using [Reflector](https://wiki.archlinux.org/index.php/reflector) to update your mirrorlist with the fastest mirrors near you. Without this, you'll only have the single mirror we added earlier.

Finally, you might have noticed some issues with the locale settings on the distro. To fix this, edit `/etc/locale.gen` and uncomment your desired locale, then run `locale-gen` (this will require `fakeroot-tcp` above) and then run `export LANG=en_GB.UTF-8` (for your desired locale, add this to `.bashrc` or `.zshrc` for it to persist).

---

After running all these steps, you should have a ArchLinux installation in WSL that works pretty well. I've not yet noticed any other issues and I'll update this post if I do.
