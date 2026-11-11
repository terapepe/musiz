// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title Musiz Music NFTs — every track is an ERC-1155 id, priced and paid in the platform token.
/// @notice Any artist holding at least `minHold` tokens can create a track. Each sale splits the
///         payment: `burnBps` is sent to the dead address, `feeBps` to the treasury, the rest to the artist.
contract MusizMusic is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint16 public constant MAX_TOTAL_BPS = 3000; // burn + fee can never exceed 30%

    IERC20 public immutable payToken;
    address public treasury;
    uint16 public burnBps;
    uint16 public feeBps;
    uint256 public minHold;

    struct Track {
        address artist;
        uint96 maxSupply; // 0 = open edition
        uint256 price; // in payToken base units
        uint256 minted;
        string name;
        string image; // ipfs:// or ar:// or https://
        string audio;
    }

    Track[] private _tracks;
    mapping(address => uint256[]) private _byArtist;

    event TrackCreated(uint256 indexed id, address indexed artist, string name, uint256 price, uint256 maxSupply);
    event TrackSold(uint256 indexed id, address indexed buyer, uint256 amount, uint256 paid, uint256 burned, uint256 fee);
    event TrackPriceUpdated(uint256 indexed id, uint256 price);
    event ConfigUpdated(address treasury, uint16 burnBps, uint16 feeBps, uint256 minHold);

    error NotEnoughHeld(uint256 balance, uint256 required);
    error BadInput();
    error SoldOut();
    error NotArtist();
    error FeesTooHigh();

    constructor(IERC20 token_, address owner_, address treasury_, uint16 burnBps_, uint16 feeBps_, uint256 minHold_)
        ERC1155("")
        Ownable(owner_)
    {
        payToken = token_;
        _setConfig(treasury_, burnBps_, feeBps_, minHold_);
    }

    // ---------- artists ----------

    function createTrack(string calldata name_, string calldata image_, string calldata audio_, uint256 price_, uint96 maxSupply_)
        external
        returns (uint256 id)
    {
        uint256 bal = payToken.balanceOf(msg.sender);
        if (bal < minHold) revert NotEnoughHeld(bal, minHold);
        if (bytes(name_).length == 0 || bytes(name_).length > 120 || bytes(audio_).length == 0 || bytes(image_).length == 0) revert BadInput();

        id = _tracks.length;
        _tracks.push(Track(msg.sender, maxSupply_, price_, 0, name_, image_, audio_));
        _byArtist[msg.sender].push(id);
        emit TrackCreated(id, msg.sender, name_, price_, maxSupply_);
    }

    function setTrackPrice(uint256 id, uint256 price_) external {
        if (_tracks[id].artist != msg.sender) revert NotArtist();
        _tracks[id].price = price_;
        emit TrackPriceUpdated(id, price_);
    }

    // ---------- fans ----------

    function mint(uint256 id, uint256 amount) external nonReentrant {
        Track storage t = _tracks[id];
        if (amount == 0) revert BadInput();
        if (t.maxSupply != 0 && t.minted + amount > t.maxSupply) revert SoldOut();
        t.minted += amount;

        uint256 total = t.price * amount;
        uint256 burned = (total * burnBps) / 10_000;
        uint256 fee = (total * feeBps) / 10_000;
        if (total > 0) {
            if (burned > 0) payToken.safeTransferFrom(msg.sender, DEAD, burned);
            if (fee > 0) payToken.safeTransferFrom(msg.sender, treasury, fee);
            payToken.safeTransferFrom(msg.sender, t.artist, total - burned - fee);
        }
        _mint(msg.sender, id, amount, "");
        emit TrackSold(id, msg.sender, amount, total, burned, fee);
    }

    // ---------- views ----------

    function tracksCount() external view returns (uint256) {
        return _tracks.length;
    }

    function getTrack(uint256 id) external view returns (Track memory) {
        return _tracks[id];
    }

    /// @notice Newest-first page of tracks.
    function getTracks(uint256 offset, uint256 limit) external view returns (Track[] memory list, uint256[] memory ids) {
        uint256 n = _tracks.length;
        if (offset >= n) return (list, ids);
        uint256 size = n - offset < limit ? n - offset : limit;
        list = new Track[](size);
        ids = new uint256[](size);
        for (uint256 i; i < size; ++i) {
            uint256 id = n - 1 - offset - i;
            ids[i] = id;
            list[i] = _tracks[id];
        }
    }

    function tracksOf(address artist) external view returns (uint256[] memory) {
        return _byArtist[artist];
    }

    function uri(uint256 id) public view override returns (string memory) {
        Track storage t = _tracks[id];
        bytes memory json = abi.encodePacked(
            '{"name":"', _esc(t.name),
            '","description":"Music NFT on musiz.xyz","image":"', _esc(t.image),
            '","animation_url":"', _esc(t.audio),
            '","attributes":[{"trait_type":"Artist","value":"', Strings.toHexString(t.artist),
            '"},{"trait_type":"Price","value":"', t.price.toString(),
            '"},{"trait_type":"Max supply","value":"', uint256(t.maxSupply).toString(), '"}]}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(json));
    }

    // ---------- owner ----------

    function setConfig(address treasury_, uint16 burnBps_, uint16 feeBps_, uint256 minHold_) external onlyOwner {
        _setConfig(treasury_, burnBps_, feeBps_, minHold_);
    }

    function _setConfig(address treasury_, uint16 burnBps_, uint16 feeBps_, uint256 minHold_) internal {
        if (uint256(burnBps_) + feeBps_ > MAX_TOTAL_BPS) revert FeesTooHigh();
        if (treasury_ == address(0)) revert BadInput();
        (treasury, burnBps, feeBps, minHold) = (treasury_, burnBps_, feeBps_, minHold_);
        emit ConfigUpdated(treasury_, burnBps_, feeBps_, minHold_);
    }

    /// @dev Escape quotes and backslashes so user strings can't break the metadata JSON.
    function _esc(string memory s) private pure returns (string memory) {
        bytes memory b = bytes(s);
        uint256 extra;
        for (uint256 i; i < b.length; ++i) if (b[i] == '"' || b[i] == "\\") ++extra;
        if (extra == 0) return s;
        bytes memory out = new bytes(b.length + extra);
        uint256 j;
        for (uint256 i; i < b.length; ++i) {
            if (b[i] == '"' || b[i] == "\\") out[j++] = "\\";
            out[j++] = b[i];
        }
        return string(out);
    }
}
